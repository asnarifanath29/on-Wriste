const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const bcrypt = require('bcrypt');

const loadprofilepage = async (req, res) => {
    const userData = req.session.userData || null;

    if (!userData) {
        return res.redirect("/login");
    }

    try {
        // Fetch user addresses
        const addresses = await Address.find({ userId: userData.id });
        const user = await User.findOne({ _id: userData.id });
        // Fetch orders and populate product details
        const orders = await Order.find({ userId: userData.id })
            .sort({ createdAt: -1 })
            .populate('items.productId');

        // Fetch wallet details for the user, if exists
        const wallet = await Wallet.findOne({ userId: userData.id });

        // if (!wallet) {
        //     console.warn("No wallet found for user:", userData.id);
        // }

        // Pass wallet balance as 0 if wallet doesn't exist
        const walletBalance = wallet ? wallet.balance : 0;
        const transactions = wallet ? wallet.transactions : [];

        // Render the profile page with all the data
        res.render("profile", {
            userData,
            addresses,
            order:orders,
            walletBalance,
            transactions,
            user
        });

    } catch (error) {
        console.error("Error loading profile page:", error);
        res.redirect("/pageNotFound");
    }
};


const updateprofilepage = async (req, res) => {
    try {
        const { name, phone } = req.body;

        const email = req.session?.userData?.email;
        if (!email) {
            return res.status(401).json({
                success: false,
                message: "Email not found in session",
            });
        }

        const updatedUser = await User.findOneAndUpdate(
            { email },
            { name, phone },
            { new: true }
        );
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        req.session.userData.name = name;
        req.session.userData.phone = phone;

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: { name, phone },
        });
    } catch (error) {
        console.error("Error updating profile:", error);

        return res.status(500).json({
            success: false,
            message: "An error occurred while updating the profile",
        });
    }
};


const loadaddressfieldpage = async (req, res) => {
    const userData = req.session.userData || null;
    try {
        res.render("address", { userData })
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
const addaddress = async (req, res) => {
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
            addressType,
            isPrimary
        } = req.body;

        if (!name || !phone || !pincode || !locality || !address || !place || !state || !addressType) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled' });
        }

         
         if (isPrimary === 1) {
            await Address.updateMany({ userId:req.session.userData.id, isPrimary: 1 }, { $set: { isPrimary: 0 } });
        }

        const newAddress = new Address({
            userId: req.session.userData.id,
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
            isPrimary,
            isBlocked: false,
        });

        await newAddress.save();

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

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).send('Address not found');
        }
        res.render("editaddress", { userData, address })
    } catch (error) {
        console.error('Error fetching address:', error);
        return res.status(500).send('Internal server error');
    }
}

const deleteaddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        await Address.findByIdAndDelete(addressId);
        res.status(200).send({ success: true, message: 'Address deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: 'Error deleting address' });
    }
};

const updatepassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {

        const userId = req.session.userData.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect current password." });
        }

        // Step 4: Validate the new password (e.g., at least 6 characters)
        // if (newPassword.length < 6) {
        //     return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
        // }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

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
            addressType,
            isPrimary
        } = req.body;

        if (!name || !phone || !pincode || !locality || !address || !place || !state || !addressType) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled' });
        }
        
        if (isPrimary === 1) {
            await Address.updateMany({ userId:req.session.userData.id, isPrimary: 1 }, { $set: { isPrimary: 0 } });
        }

        const updatedAddress = await Address.findByIdAndUpdate(
            req.params.id,
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
                isPrimary,
                isBlocked: false,
            },
            { new: true }
        );

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
    loadprofilepage, updateprofilepage, loadaddressfieldpage, addaddress, geteditaddress, editaddress, deleteaddress, updatepassword
}

