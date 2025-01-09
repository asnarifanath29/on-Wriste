// middleware/adminAuth.js


const adminAuth = (req, res, next) => {
    console.log('req.file');
    console.log(req.file);
    if (req.session.isAdmin) {
        return next();
    }
    return res.redirect('/admin/login');
};

const isLogin = (req, res, next) => {
    if (req.session.isAdmin) {
        res.redirect('/admin/dashboard')
    } else {
        next()
    }
}
module.exports = {
    adminAuth,
    isLogin
}
