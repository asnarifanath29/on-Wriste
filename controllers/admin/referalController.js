const User=require("../../models/userSchema")




const loadReferalPage=async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 5; 
        const skip = (page - 1) * limit;

        const users = await User.find()
            .populate('referredBy', 'name').skip(skip).limit(limit);
        
        const count=await User.countDocuments();  
        const totalPages = Math.ceil(count / limit);
        const totalReferrals = users.reduce((acc, user) => acc + user.referralCount, 0);
        const activeUsers = users.filter(user => !user.isBlocked).length;
        const totalRewards = totalReferrals * 200; 

        res.render('referal', {
            users,
            totalReferrals,
            activeUsers,
            totalRewards,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error('Error fetching referral data:', error);
        res.status(500).send('Error fetching referral data');
    }
};


module.exports={loadReferalPage}