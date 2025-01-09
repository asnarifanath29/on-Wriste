const { name } = require("ejs")
const User = require("../../models/userSchema")
const Otp = require("../../models/otpSchema");
const Product = require("../../models/productSchema");
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer")
const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

// const loadHomepage = async (req, res) => {
//     try {
//         return res.render("home")

//     } catch (error) {
//         console.log("Home page not found")
//         res.status(500).send("Server error")
//     }
// }

const loadHomepage = async (req, res) => {
    try {
        let userData;
        if(req.session.passport){
         const userId=req.session.passport.user;
         userData= await User.findOne({_id: userId, isBlocked:false})
        } else {
            userData = req.session.userData;
        }
    
        return res.render("home", {
            userData// Pass the session user data to the template
        });
    } catch (error) {
        console.log("Home page not found");
        res.status(500).send("Server error");
    }
};


const loadSignup = async (req, res) => {

    try {
        const userData = req.session.user || null;
        res.render("signup", { userData })
    }
    catch (error) {
        console.log('Signup not loading', error)
        res.status(500).send('Server Error');
    }
}
// const signup=async (req,res)=>{
//     const {name,email,phone,password}=req.body
//     console.log(req.body)
//     try{
//         const newUser=new user({name,email,phone,password})

//         await newUser.save();
//         console.log(newUser)
//         return res.redirect("/signup")
//     }
//     catch(error){
//         console.log("Error saving user",error)
//         res.status(500).send('Internal sever error')
//     }
// }

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


async function sendVerificationEmail(email, otp, session) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: "asnarifanath@gmail.com",
                pass: "trza lilt qrus unaa"
            }

        })
        console.log("Sending OTP email to:", email);

        const info = await transporter.sendMail({
            from: "asnarifanath@gmail.com",
            to: email,
            subject: "Your OTP for Verification",
            text: `Your OTP is: ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        });
        session.email = email;
        session.otp = otp;
        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending email", error);
        return false;

    }
}

const signup = async (req, res) => {
    try {
        console.log('req.body : ');
        console.log(req.body);
        const { email, password, phone, name } = req.body;
        // console.log("UC:- req.body" + email);

        const findUser = await User.findOne({ email });

        if (findUser) {
            return res.status(401).json({ success: false, message: "User with this email already exists" })
        }

        const otp = generateOtp()
        const otpExpiry = Date.now() + 300000;


        const otpStore = new Otp({
            email: email,
            otp: otp,
            otpExpiry: otpExpiry
        })

        await otpStore.save()

        const emailSent = await sendVerificationEmail(email, otp, req.session)
        if (!emailSent) {
            return res.status(401).json({ success: false, message: "Email not sented" })
        }
        console.log("OTP send : ", otp)
        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        req.session.userData = {
            name: name,
            email: email,
            phone: phone,
            password: hashedPassword,
        }

        return res.status(200).json({ success: true, message: "OTP sented, pls enter the otp" })
    }
    catch (error) {
        console.error("sign in error", error)
        res.redirect("/pageNotFound")
    }
}


const resendOtp = async (req, res) => {
    try {
        const otp = generateOtp()
        const otpExpiry = Date.now() + 300000;

        console.log('req.session.userData-2 : ');
        console.log(req.session.userData);
        
        const otpStore = new Otp({
            email: req.session.userData.email,
            otp: otp,
            otpExpiry: otpExpiry
        })

        await otpStore.save()
        res.json({ success: true })
    } catch (error) {

    }

}


const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const otpCheck = await Otp.findOne({ email, otp })

        if (!otpCheck) {
            return res.status(200).json({ success: false, message: "OTP verification Failed." });
        }

        await Otp.deleteOne({ email, otp })

        console.log('req.session.userData : ');
        console.log(req.session.userData);
        
        const newUser = new User({
            name: req.session.userData.name,
            email: req.session.userData.email,
            phone: req.session.userData.phone,
            password: req.session.userData.password
        })

        delete req.session.userData.password

        await newUser.save();

        return res.status(200).json({ success: true, message: "OTP verified. Account successfully created." });

    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).send("Internal server error");
    }
};


const loadOtpPage = async (req, res) => {
    try {
        console.log("Session Data:", req.session);
        const email = req.session.userData.email;
        if (!email) {
            return res.redirect("/signup");
        }
        return res.render("otp", { userEmail: email, userData: req.session.userData });
    } catch (error) {
        console.log("Error loading OTP page:", error);
        res.status(500).send("Server error");
    }
};
const loadLoginpPage = async (req, res) => {
    try {
        const userData = req.session.user || null;
        res.render("login", { userData });  // Renders the login page (EJS template)
    } catch (error) {
        console.log("Error loading login page:", error);
        res.status(500).send("Server error");
    }
};

// Function to handle user login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;  // Get email and password from the form
        console.log("Login attempt:", req.body);

        // Check if email is provided
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }


        // Find user by email in the database
        const user = await User.findOne({ email });

        // If user is not found
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email ." });
        }

        // Check if the password matches
        // if (user.password !== password) {
        //     return res.status(401).json({ success: false, message: "Invalid  password." });
        // }

        // Compare the provided password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid password." });
        }
        // // Check if the user is blocked
        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: "Your account is blocked. Please contact support." });
        }

        // Create a session for the logged-in user
        req.session.userData = {
            name: user.name,
            email: user.email,
            phone: user.phone,

        };

        return res.status(200).json({ success: true, message: "Login successful", redirect: "/home" });
    } catch (error) {
        console.log("Login error:", error);
        res.status(500).send("Server error");
    }
};

// const shop=async (req, res) => {
//     try {
//         const products = await Product.find({ isDeleted: false });
//         res.render('shop', { products });
//     } catch (error) {
//         console.error('Error fetching products:', error.message); // Log the error message
//         console.error(error.stack); // Log the stack trace for debugging
//         res.status(500).send('Error loading shop page');
//     }
// };


const shop = async (req, res) => {
    try {
        // const sortOption = req.query.sort || 'newest';
        // let sortQuery = {};

        // switch (sortOption) {
        //     case 'price-high':
        //         sortQuery = { price: -1 };
        //         break;
        //     case 'price-low':
        //         sortQuery = { price: 1 };
        //         break;
        //     case 'popular':
        //         sortQuery = { rating: -1 };
        //         break;
        //     default:
        //         sortQuery = { createdAt: -1 }; // newest first
        // }

 

    const products = await Product.find({ isDeleted: false })
        .populate({
            path: 'category',
            match: { status: 'listed' }, // Ensure only 'listed' categories are included
        })
        // .sort(sortQuery);

    // Remove products with null or unpopulated categories
    const filteredProducts = products.filter(product => product.category);

    // Render the shop page with filtered products
    res.render('shop', {
        products: filteredProducts,
        title: 'Shop Page',
    });
} catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send('Internal Server Error');
}
    
};

const productDetails = async (req, res) => {
    const product = await Product.findById(req.params.id).populate('category'); // Fetch the product by ID
    res.render('product', { product });
};

const logout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Server error during logout");
        }
        // Redirect to the homepage after logout
        res.redirect('/');
    });
};

const loadforgotpage = async(req,res)=>
    {
        const userData = req.session.user || null;
        try {
            res.render("forgot", { userData })
        }
        catch (error) {
            console.log('forgot page not loading', error)
            res.status(500).send('Server Error');
        }
    }

    const verifyforgot = async (req, res) => {
        try {
            const { email } = req.body;
    
            // Validate the incoming email
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required.' });
            }
    
            const userExists = await User.findOne({ email: email });
    
            if (userExists) {
                req.session.email = email;
                const otp = generateOtp()
                const otpExpiry = Date.now() + 300000;


        const otpStore = new Otp({
            email: email,
            otp: otp,
            otpExpiry: otpExpiry
        })

        await otpStore.save()

        const emailSent = await sendVerificationEmail(email, otp, req.session)
        if (!emailSent) {
            return res.status(401).json({ success: false, message: "Email not sented" })
        }
        console.log("OTP send : ", otp)

        req.session.email = email
       
    
        return res.status(200).json({ success: true, message: "OTP sented, pls enter the otp" })
               
            } else {
                return res.status(404).json({ success: false, message: 'Email not found. Please try again.' });
            }
        } catch (error) {
            console.error('Error in verifyforgot:', error.message);
            return res.status(500).json({ success: false, message: 'Internal server error. Please try again later.' });
        }
    };

    const loadforgototppage = async(req,res)=>
        {
            try {
                // Retrieve email from session
                const email = req.session.email;
                return res.render("forgototp", { userEmail: email });
            }
            catch (error) {
                console.log('error in loading OTP page', error)
                res.status(500).send('Server Error');
            }
        } 
        
        
    const verifyOtpforgot = async (req, res) => {
            try {
                const { email, otp } = req.body;
        
                const otpCheck = await Otp.findOne({ email, otp })
        
                if (!otpCheck) {
                    return res.status(200).json({ success: false, message: "OTP verification Failed." });
                }
        
                await Otp.deleteOne({ email, otp })
        
                console.log('req.session.userData : ');
                console.log(req.session.userData);
                
                console.log('req.session ');
                console.log(req.session);

                return res.status(200).json({ success: true, message: "OTP verified. Account successfully created." });
        
            } catch (error) {
                console.error("OTP verification error:", error);
                res.status(500).send("Internal server error");
            }
        };    
        


    const loadpasswordppage=async(req,res)=>
            {
                try {
                    return res.render("password");
                }
                catch (error) {
                    console.log('error in loading password reset page', error)
                    res.status(500).send('Server Error');
                }
            } 

       const newpassword= async (req, res) => {
        const { password, confirmPassword } = req.body;
    
        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }
    
        // Check if the user is logged in (email should be in session)
        if (!req.session.email) {
            return res.status(401).json({ error: 'User not logged in.' });
        }
    
        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);
    
        // Update the password in the database
        try {
            const user = await User.findOneAndUpdate(
                { email: req.session.email },
                { password: hashedPassword },
                { new: true }
            );
            return res.status(200).json({ success: true, message:'Password updated successfully.' });
        
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    };
      
    

    const resendforgot=async(req,res)=>
        {
    try {
        const otp = generateOtp()
        const otpExpiry = Date.now() + 300000;

        console.log(req.session.email)
        console.log("req.session")

        const otpStore = new Otp({
            email: req.session.email,
            otp: otp,
            otpExpiry: otpExpiry
        })
        console.log("OTP send : ", otp)
        await otpStore.save()
        res.json({ success: true })
    } catch (error) {

    }
        }

            
const addtocart = async (req,res)=>{
    res.json({success : true})
}

module.exports = {
    loadHomepage, pageNotFound, loadSignup, signup, resendOtp, verifyOtp, loadOtpPage, loadLoginpPage, login, shop, productDetails, 
    logout, loadforgotpage,verifyforgot,loadforgototppage,verifyOtpforgot,loadpasswordppage,newpassword,resendforgot,addtocart
} 

