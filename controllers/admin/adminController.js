const User = require("../../models/userSchema")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const loadLogin = async (req, res) => {
    try {
        return res.render("admin")
    } catch (error) {
        console.log("admin page not found")
        res.status(500).send("Server error")
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordmatch = await bcrypt.compare(password, admin.password);

            if (passwordmatch) {
               
                req.session.isAdmin = true;
              
                return res.status(401).json({
                    "success": true,
                    "message": "Login successful!"
                  });
             
            } else {
                return res.status(401).json({ success: false, message: "Invalid password" });
            }
        } else {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }
    } catch (error) {
        console.log("login error", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const loadDashboared = async (req, res) => {
    try {
        return res.render("dashboared")

    } catch (error) {
        console.log("Dashboared not found")
        res.status(500).send("Server error")
    }
}

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to log out' });
        }
        res.redirect('/admin/login');
    });
};

const userManagement = async (req, res) => {
    if (!req.session.isAdmin) {

        return res.redirect('/admin/login');
    }

    const users = await User.find();
    res.render('userManagement', { users });

};

const userControl = async (req, res) => {
    const { userId, action } = req.body;

    try {
        const user = await User.findById(userId);
        if (user) {
            user.isBlocked = action === 'block';
            await user.save();
            return res.json({ success: true });
        } else {
            return res.json({ success: false, message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};







module.exports = { loadLogin, login, loadDashboared, logout, userManagement, userControl };