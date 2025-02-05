const userSchema = require('../models/userSchema');

const checkUserStatus = async (req, res, next) => {

    
    if (req.session.userData) {
        try {
            const user = await userSchema.findOne({ email: req.session.userData.email });
            if (!user) {
                console.log('User account does not exist. Destroying session.');
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                    }
                    return res.redirect('/home?status=deleted');
                });
            } else if (user.isBlocked === true ) {
                console.log('User account is banned. Destroying session.');
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                    }
                    return res.redirect('/home?status=banned');
                });
            } else {
                return next();
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            return res.status(500).send('Internal Server Error');
        }
    } else {
        return res.redirect('/home?status=noUsers');
    }
};

module.exports = checkUserStatus;