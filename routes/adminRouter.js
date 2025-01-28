const express = require('express')
const router = express.Router()
const { adminAuth, isLogin } = require('../middlewares/adminAuth');
const adminController = require("../controllers/admin/adminController")
const categoryController = require("../controllers/admin/categoryController")
const productController = require('../controllers/admin/productController');
const orderController=require("../controllers/admin/orderController");
const coupenController=require("../controllers/admin/coupenController")
const salesController=require("../controllers/admin/salesController")
const referalController=require("../controllers/admin/referalController")
const downloadController=require("../controllers/admin/downloadReport")
const upload = require('../middlewares/upload');


router.get("/login", isLogin, adminController.loadLogin)
router.post("/login", adminController.login)
router.get("/dashboard", adminController.loadDashboared)
router.post("/logout", adminAuth, adminController.logout)


router.get('/userManagement', adminAuth, adminController.userManagement)
router.post('/userManagement/toggle-block', adminAuth, adminController.userControl)


router.get('/categories', adminAuth, categoryController.categoriesget)
router.get('/categories/add',adminAuth, categoryController.getAddPage);
router.post('/categories', adminAuth, categoryController.categories)
router.get('/categories/edit/:id',adminAuth, categoryController.getEditPage);
router.post('/categories/edit', adminAuth, categoryController.categoriesedit);
router.patch('/categories/:id/list', adminAuth, categoryController.categorieslist)
router.patch('/categories/:id/unlist', adminAuth, categoryController.categoriesunlist)

router.post('/categories/add-offer/:categoryId', categoryController.addOffer);
router.post('/categories/remove-offer/:categoryId', categoryController.removeOffer);



router.get('/products', adminAuth, productController.getProduct);
router.get('/add-product',adminAuth, productController.getAddPage);
router.post('/add-product', adminAuth, upload.fields([
    { name: 'productImage1', maxCount: 1 },
    { name: 'productImage2', maxCount: 1 },
    { name: 'productImage3', maxCount: 1 },
    { name: 'productImage4', maxCount: 1 }
]), productController.addProduct);
router.get('/products/edit/:id',adminAuth, productController.getEditPage)
router.post('/products/edit', adminAuth,  upload.fields([
    { name: 'productImage1', maxCount: 1 },
    { name: 'productImage2', maxCount: 1 },
    { name: 'productImage3', maxCount: 1 },
    { name: 'productImage4', maxCount: 1 }
]), productController.editProduct);
router.patch('/products/:id/toggle-list', productController.toggleFeatured);


router.get("/order",adminAuth,orderController.getOrderPage)

router.post('/update',adminAuth,orderController.updateOrderStatus);


router.post('/update-payment-status',adminAuth,orderController.updatePaymentStatus)


router.post('/orders/:orderId/accept-return', orderController.acceptReturn);
router.post('/orders/:orderId/reject-return', orderController.rejectReturn);



router.get("/coupen",adminAuth,coupenController.getCoupenPage)
router.post("/coupon",adminAuth,coupenController.createCoupon)
router.post('/coupon/:id',adminAuth,coupenController.editCoupen)
router.patch('/coupon/status/:id',adminAuth,coupenController.statusChange)

router.get("/salesReport",adminAuth,salesController.getSalesReport)
router.get("/generateReport",adminAuth,salesController.generateReport)



router.get("/referal",adminAuth,referalController.loadReferalPage)


router.get("/downloadpdf",adminAuth,downloadController.downloadPDF)
router.get("/downloadexcel",adminAuth,downloadController.downloadExcel)

module.exports = router
