const express = require('express')
const router = express.Router()
const passport = require('passport')
const userController = require("../controllers/user/userController")
const User = require("../models/userSchema")
const userAuth = require('../middlewares/userAuth');
router.get("/pageNotFound", userController.pageNotFound)
router.get("/", userController.loadHomepage)
router.get("/home", userController.loadHomepage)
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.get("/otp", userController.loadOtpPage)
router.post("/otp", userController.verifyOtp);
router.post("/resentOtp", userController.resendOtp);

router.post("/resendforgot", userController.resendforgot);


router.get("/login", userController.loadLoginpPage);
router.post("/login", userController.login);

router.get("/shop", userController.shop);
router.get("/product/:id", userController.productDetails);
router.get("/add-to-cart", userAuth, userController.addtocart);
router.get('/logout', userController.logout);
router.get('/forgot', userController.loadforgotpage);
router.post('/forgot', userController.verifyforgot);
router.get('/forgot_otp', userController.loadforgototppage);
router.post('/verifyOtpforgot', userController.verifyOtpforgot);
router.get('/password_reset', userController.loadpasswordppage);
router.post('/password_reset', userController.newpassword)

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
// router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
//      res.redirect('/')
// })
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), async (req, res) => {
  try {
    const user = req.session.passport.user;
    const userData = await User.findOne({ _id: user, isBlocked: false });
    if (userData) {

      req.session.userData = {
        email: req.user.email,
        name: req.user.name,
        id: req.user._id,
      };

      return res.redirect('/home');
    }
    req.session.destroy();
    return res.redirect('/login?message=User is blocked');
  } catch (error) {
    console.log('Passport error', error)
    res.redirect('/pageNotFound')
  }
});

module.exports = router

