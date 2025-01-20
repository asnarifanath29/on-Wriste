const User = require("../../models/userSchema")
const Address = require("../../models/addressSchema");
const Order=require("../../models/orderSchema")
const bcrypt = require('bcrypt');

// const loadprofilepage = async (req, res) => {
//     const userData = req.session.userData || null;
    
//     if (!userData) {
//         return res.redirect("/login"); // Redirect if no user data found in session
//     }
    
//     try {
//         // Fetch the addresses for the logged-in user from the Address model
//         const addresses = await Address.find({ userId: userData.id });
//         const order = await Order.find({ userId: userData.id });
//         // Render the profile page with userData and addresses
//         res.render("profile", { userData, addresses ,order});
//     } catch (error) {
//         console.error("Error loading profile page:", error);
//         res.redirect("/pageNotFound");
//     }
// }

const loadprofilepage = async (req, res) => {
    const userData = req.session.userData || null;
    
    if (!userData) {
        return res.redirect("/login");
    }
    
    try {
        const addresses = await Address.find({ userId: userData.id });
        const orders = await Order.find({ userId: userData.id })
            .sort({ createdAt: -1 })
            .populate('items.productId')
            // .populate('appliedCoupon.couponId');
            
        res.render("profile", {
            userData,
            addresses,
            order: orders
        });
    } catch (error) {
        console.error("Error loading profile page:", error);
        res.redirect("/pageNotFound");
    }
};

const updateprofilepage = async (req, res) => {
    try {
        const { name, phone } = req.body;

        // Check if email is present in the session
        const email = req.session?.userData?.email;
        if (!email) {
            return res.status(401).json({
                success: false,
                message: "Email not found in session",
            });
        }

        // Update the user's data in the database using email as the identifier
        const updatedUser = await User.findOneAndUpdate(
            { email },
            { name, phone },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Update session data for name and phone
        req.session.userData.name = name;
        req.session.userData.phone = phone;

        // Return a success response
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: { name, phone },
        });
    } catch (error) {
        console.error("Error updating profile:", error);

        // Return an error response
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating the profile",
        });
    }
};


const loadaddressfieldpage = async (req, res) => {
    const userData = req.session.userData || null;
    try {
        res.render("address",{ userData })
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
const addaddress=async (req, res) => {
    try {
        const { 
            name, 
            phone, 
            pincode, 
            locality, 
            address, 
            place, 
            state, 
            landmark, 
            alternatePhone, 
            addressType 
        } = req.body;

        // Validation: You can perform server-side validation here as well if needed
        if (!name || !phone || !pincode || !locality || !address || !place || !state || !addressType) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled' });
        }

        // Create new address document
        const newAddress = new Address({
            userId: req.session.userData.id, // Assuming user ID is stored in the session
            name,
            phone,
            pincode,
            locality,
            address,
            place,
            state,
            landmark,
            alternatePhone,
            addressType,
            isBlocked: false, // Default is not blocked
        });

        // Save the address to the database
        await newAddress.save();

        // Respond with success
        res.status(200).json({ success: true, message: 'Address added successfully!' });
    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).json({ success: false, message: 'An error occurred while adding the address' });
    }
};

const geteditaddress = async (req, res) => {
    const userData = req.session.userData || null;
    try {
        const addressId = req.params.id;

        // Fetch the address details from the database
        const address = await Address.findById(addressId);

        if (!address) {
            return res.status(404).send('Address not found');
        }
        res.render("editaddress",{ userData, address })
    } catch (error) {
        console.error('Error fetching address:', error);
        return res.status(500).send('Internal server error');
    }
}

const deleteaddress=async (req, res) => {
    try {
      const addressId = req.params.id;
      await Address.findByIdAndDelete(addressId); // Delete the address
      res.status(200).send({ success: true, message: 'Address deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).send({ success: false, message: 'Error deleting address' });
    }
  };

const updatepassword= async(req,res)=>{
    const { currentPassword, newPassword } = req.body;

    try {
        
        const userId = req.session.userData.id; 

        // Step 2: Fetch the user from the database
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Step 3: Check if the current password is correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect current password." });
        }

        // Step 4: Validate the new password (e.g., at least 6 characters)
        // if (newPassword.length < 6) {
        //     return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
        // }

        // Step 5: Hash the new password before saving
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Step 6: Update the user's password in the database
        user.password = hashedPassword;
        await user.save();

        // Step 7: Send success response
        res.status(200).json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "An error occurred while updating the password." });
    }
}
const editaddress = async (req, res) => {
    try {
        const { 
            name, 
            phone, 
            pincode, 
            locality, 
            address, 
            place, 
            state, 
            landmark, 
            alternatePhone, 
            addressType 
        } = req.body;

        // Validation: Ensure required fields are present
        if (!name || !phone || !pincode || !locality || !address || !place || !state || !addressType) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled' });
        }

        // Find the address by ID and update it
        const updatedAddress = await Address.findByIdAndUpdate(
            req.params.id,  // The address ID from the route parameter
            {
                name,
                phone,
                pincode,
                locality,
                address,
                place,
                state,
                landmark,
                alternatePhone,
                addressType,
                isBlocked: false,  // Default is not blocked
            },
            { new: true } // Return the updated document
        );

        // Check if the address was found and updated
        if (!updatedAddress) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        res.status(200).json({ success: true, message: 'Address updated successfully!', data: updatedAddress });
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the address' });
    }
};


module.exports = {
    loadprofilepage,updateprofilepage,loadaddressfieldpage,addaddress,geteditaddress,editaddress,deleteaddress,updatepassword}

