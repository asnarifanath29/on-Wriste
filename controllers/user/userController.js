const { name } = require("ejs")
const mongoose = require('mongoose');
const User = require("../../models/userSchema")
const Otp = require("../../models/otpSchema");
const Product = require("../../models/productSchema");
const Category = require('../../models/categorySchema')
const Wallet = require('../../models/walletSchema')
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer")

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const loadHomepage = async (req, res) => {
    try {
        let userData;
        if (req.session.passport) {
            const userId = req.session.passport.user;
            userData = await User.findOne({ _id: userId, isBlocked: false })
        } else {
            userData = req.session.userData;
        }
        return res.render("home", {
            userData
        });
    } catch (error) {
        console.log("Home page not found");
        res.status(500).send("Server error");
    }
};


const loadSignup = async (req, res) => {
    try {
        const referralCode = req.query.ref || null;
        const userData = req.session.user || null;
        res.render("signup", { userData ,referralCode})
    }
    catch (error) {
        console.log('Signup not loading', error)
        res.status(500).send('Server Error');
    }
}


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
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }

        })
        console.log("Sending OTP email to:", email);

        const info = await transporter.sendMail({
            from: process.env.MAIL_USER,
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

        const { email, password, phone, name ,referralcode} = req.body;

        
        

        const findUser = await User.findOne({ email });

        if (findUser) {
            return res.status(401).json({ success: false, message: "User with this email already exists" })
        }

       
        if (referralcode) {
            const referrer = await User.findOne({ referralCode : referralcode });
            console.log("referrer : "+referrer);
            
            if (referrer) {
                req.session.referredBy = referrer._id;
                console.log("Referred By id :", req.session.referredBy); 
            }
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

        const hashedPassword = await bcrypt.hash(password, 10);

        req.session.userData = {
            name: name,
            email: email,
            phone: phone,
            password: hashedPassword,
            
        }
        
        console.log("am here:::")
        console.log(req.session)

        return res.status(200).json({ success: true, message: "OTP sented, pls enter the otp" })
    }
    catch (error) {
        console.error("sign in error", error)
        res.redirect("/pageNotFound")
    }
}
const loadOtpPage = async (req, res) => {
    try {
    
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


const resendOtp = async (req, res) => {
    try {
        const otp = generateOtp()
        const otpExpiry = Date.now() + 300000;

        const otpStore = new Otp({
            email: req.session.userData.email,
            otp: otp,
            otpExpiry: otpExpiry
        })
        await otpStore.save()
        const email = req.session.userData.email;
        console.log("Resend OTP : ", otp)
        const emailSent = await sendVerificationEmail(email, otp, req.session)
        if (!emailSent) {
            return res.status(401).json({ success: false, message: "Email not sented" })
        }
        
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


        const newUser = new User({
            name: req.session.userData.name,
            email: req.session.userData.email,
            phone: req.session.userData.phone,
            password: req.session.userData.password,
            referredBy: req.session.referredBy
        })

        delete req.session.userData.password

        await newUser.save();

        req.session.userData = {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
        };

        await new Wallet({
            userId: newUser._id, 
            balance: 0, 
            transactions: [] 
        }).save();




        if (req.session.referredBy) {
            
            const referrerWallet = await Wallet.findOne({ userId: req.session.referredBy });
        
            if (referrerWallet) {
                referrerWallet.balance += 100; 
                referrerWallet.transactions.push({
                    amount: 100,
                    type: 'Credit',
                    description:` Referral bonus for referring ${newUser.email}`
                });
        
                await referrerWallet.save(); 
            }
        
            
            const userWallet = await Wallet.findOne({ userId: newUser._id });
        
            if (userWallet) {
                userWallet.balance += 100; 
                userWallet.transactions.push({
                    amount: 100,
                    type: 'Credit',
                    description: 'Signup bonus from referral' 
                });
        
                await userWallet.save();
            }
            
        
            
            await User.findByIdAndUpdate(req.session.referredBy, {
                $inc: { referralCount: 1 } 
            });
        }

      

        return res.status(200).json({ success: true, message: "OTP verified. Account successfully created." });

    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).send("Internal server error");
    }
};



const loadLoginpPage = async (req, res) => {
    try {
        const userData = req.session.user || null;
        res.render("login", { userData });
    } catch (error) {
        console.log("Error loading login page:", error);
        res.status(500).send("Server error");
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email ." });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid password." });
        }
        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: "Your account is blocked. Please contact support." });
        }
        req.session.userData = {
            id:user._id,
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

const shop = async (req, res) => {
    try {
        const categories = await Category.find({ status: 'listed' }); 
        const products = await Product.find({ isDeleted: false })
            .populate({
                path: 'category',
                match: { status: 'listed' },
            })

        const filteredProducts = products.filter(product => product.category);

        res.render('shop', {
            products: filteredProducts,
            title: 'Shop Page',
            categories:categories,
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Internal Server Error');
    }
};

// const productDetails = async (req, res) => {
//     const product = await Product.findById(req.params.id).populate('category');
//     res.render('product', { product });
// };

const productDetails = async (req, res) => {
    try {
        // Fetch the product by ID and populate its category
        const product = await Product.findById(req.params.id).populate('category');
        const userData = req.session.userData || null;

        // If the product does not exist, return a 404 error
        if (!product) {
            return res.status(404).render('404', { userData });
        }

        // Render the product page, passing both product and userData
        res.render('product', { product, userData });
    } catch (error) {
        console.error("Error fetching product details:", error);
    }
};





const logout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Server error during logout");
        }
        res.redirect('/');
    });
};

const loadforgotpage = async (req, res) => {
    const userData = req.session.userData || null;
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
            console.log( "frogot otp" ,otp)
            const emailSent = await sendVerificationEmail(email, otp, req.session)
            if (!emailSent) {
                return res.status(401).json({ success: false, message: "Email not sented" })
            }
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

const loadforgototppage = async (req, res) => {
    try {
        const email = req.session.email;
        return res.render("forgototp", { userEmail: email, userData: req.session.userData });
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

        return res.status(200).json({ success: true, message: "OTP verified. Account successfully created." });

    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).send("Internal server error");
    }
};

const loadpasswordppage = async (req, res) => {
    const userData = req.session.userData || null;
    try {
        return res.render("password", { userData });
    }
    catch (error) {
        console.log('error in loading password reset page', error)
        res.status(500).send('Server Error');
    }
}

const newpassword = async (req, res) => {
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (!req.session.email) {
        return res.status(401).json({ error: 'User not logged in.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = await User.findOneAndUpdate(
            { email: req.session.email },
            { password: hashedPassword },
            { new: true }
        );
        return res.status(200).json({ success: true, message: 'Password updated successfully.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};



const resendforgot = async (req, res) => {
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


// const loadCartpage = async (req, res) => {
//     try {
        
//         return res.render("cart");
//     } catch (error) {
//         console.log("cart page not found");
//         res.status(500).send("Server error");
//     }
// };

module.exports = {
    loadHomepage, pageNotFound, loadSignup, signup, resendOtp, verifyOtp, loadOtpPage, loadLoginpPage, login, shop, productDetails,
    logout, loadforgotpage, verifyforgot, loadforgototppage, verifyOtpforgot, loadpasswordppage, newpassword, resendforgot,

}

