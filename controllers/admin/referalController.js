const User=require("../../models/userSchema")




const loadReferalPage=async (req, res) => {
    try {
        const users = await User.find()
            .populate('referredBy', 'name');

        const totalReferrals = users.reduce((acc, user) => acc + user.referralCount, 0);
        const activeUsers = users.filter(user => !user.isBlocked).length;
        const totalRewards = totalReferrals * 200; 

        res.render('referal', {
            users,
            totalReferrals,
            activeUsers,
            totalRewards
        });
    } catch (error) {
        console.error('Error fetching referral data:', error);
        res.status(500).send('Error fetching referral data');
    }
};


module.exports={loadReferalPage}