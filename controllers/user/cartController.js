const User = require("../../models/userSchema")
const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema")
const Address = require("../../models/addressSchema")
const Order = require("../../models/orderSchema")
const Category = require('../../models/categorySchema');
const Coupon = require("../../models/coupenSchema")
const Wallet = require("../../models/walletSchema")

const Razorpay = require('razorpay');
const crypto = require('crypto');

const loadCartpage = async (req, res) => {
    try {
        const userId = req.session.userData.id;
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        req.session.cart = cart._id;

        if (!cart || !cart.items || !Array.isArray(cart.items)) {
            return res.render('cart', {
                userData: req.session.userData,
                cart: [],
                subtotal: 0,
            });
        }

        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += item.productId.salesPrice * item.quantity;
        });

        res.render('cart', {
            userData: req.session.userData,
            cart: cart,
            subtotal: subtotal,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching cart data');
    }
};

const addtocart = async (req, res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session?.userData?.id;
        if (!userId) {
            return res.status(401).json({ success: false, notLoggedIn: true, message: 'Please log in to add items to the cart.' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        if (!cart.items) {
            cart.items = [];
        }

        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        let newQuantity;
        if (existingItemIndex !== -1) {
            newQuantity = cart.items[existingItemIndex].quantity + 1;
        } else {
            newQuantity = 1;
        }

        if (newQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: 'Stock limit reached',
                availableStock: product.stock
            });
        }

        if (existingItemIndex !== -1) {
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            cart.items.push({ productId, quantity: newQuantity });
        }

        await cart.save();

        return res.status(200).json({ success: true, message: 'Product added to cart', cart });

    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updatecart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.userData.id;

        if (!productId || quantity === undefined) {
            return res.status(400).json({ error: 'Product ID and quantity are required' });
        }

        if (quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Product not found in cart' });
        }

        const currentQuantity = cart.items[itemIndex].quantity;

        if (quantity > product.stock + currentQuantity) {
            return res.status(400).json({
                error: 'Insufficient stock',
                availableStock: product.stock
            });
        }

        const stockDifference = quantity - currentQuantity;
        product.stock -= stockDifference;

        cart.items[itemIndex].quantity = quantity;

        await cart.save();

        res.json({
            success: true,
            cart,
            updatedQuantity: quantity,
            availableStock: product.stock,
        });

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ error: 'Update failed' });
    }
};



const loadCheckoutpage = async (req, res) => {
    try {
        const subtotal = req.session.subtotal
        const userId = req.session.userData.id;
        const userAddress = await Address.find({ userId: userId }).sort({ isPrimary: -1 });;

        const currentDate = new Date();
        const validCoupons = await Coupon.find({
            status: true,
            isDeleted: false,
            validFrom: { $lte: currentDate },
            validUpto: { $gte: currentDate }
        });

        res.render("checkout", { userData: req.session.userData, addresses: userAddress, subtotal, coupons: validCoupons })
    } catch (error) {
        console.error('checkout page not loading:', error);
        res.status(500).json({ error: 'Update failed' });
    }
}

const Checkout = async (req, res) => {
    const { subtotal } = req.body;

    if (typeof subtotal === 'number' && subtotal >= 0) {
        console.log('Received subtotal:', subtotal);

        req.session.subtotal = subtotal;

        return res.status(200).json({ message: 'Subtotal received' });
    }

    console.error('Invalid subtotal:', req.body);
    return res.status(400).json({ error: 'Invalid subtotal' });
};



// const placeOrder = async (req, res) => {
//     try {
//         const { selectedAddress, paymentMethod } = req.body;

//         const cartId = req.session.cart;

//         const cart = await Cart.findById(cartId).populate('items.productId');
//         if (!cart || !cart.items.length) {
//             return res.status(400).json({
//                 message: "Your cart is empty"
//             });
//         }

//         if (!selectedAddress || !selectedAddress.name) {
//             return res.status(400).json({
//                 message: "Please select a valid delivery address"
//             });
//         }

//         if (!paymentMethod || !['cod', 'upi','netbanking'].includes(paymentMethod)) {
//             return res.status(400).json({
//                 message: "Please select a valid payment method"
//             });
//         }

//         let totalAmount = 0;
//         const orderItems = [];

//         for (const item of cart.items) {
//             const product = item.productId;

//             if (item.quantity > product.stock) {
//                 return res.status(400).json({
//                     message: `Insufficient stock for product: ${product.name}`,
//                     productId: product._id
//                 });
//             }

//             product.stock -= item.quantity;

//             await product.save();

//             const itemTotal = product.price * item.quantity;
//             totalAmount += itemTotal;

//             orderItems.push({
//                 productId: product._id,
//                 quantity: item.quantity,
//                 price: product.price,
//                 image: product.images[0],
//                 isCanceled: false
//             });
//         }

//         const shippingFee = 10;
//         const payableAmount = totalAmount + shippingFee;

//         const orderedId = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);

//         const newOrder = new Order({
//             userId: req.session.userData.id,
//             orderedId: orderedId,
//             address: selectedAddress,
//             items: orderItems,
//             paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Pending',
//             paymentMethod: paymentMethod,
//             orderStatus: 'Pending',
//             totalAmount: totalAmount,
//             payableAmount: payableAmount,
//             shippingFee: shippingFee
//         });

//         await newOrder.save();

//         await Cart.findByIdAndUpdate(cartId, { $set: { items: [] } });

//         res.status(200).json({
//             message: "Order placed successfully!",
//             orderId: newOrder._id
//         });

//     } catch (error) {
//         console.error("Error placing order:", error);
//         res.status(500).json({
//             message: "An unexpected error occurred while processing your order."
//         });
//     }
// };


const placeOrder = async (req, res) => {
    try {
        const {
            userId,
            addressDetails,
            paymentMethod,
            orderAmount,
            appliedCoupon,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature
        } = req.body;

        // Fetch user's cart
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Generate unique order ID
        const orderedId = crypto.randomBytes(8).toString('hex').toUpperCase();

        // Map cart items to order items format
        const orderItems = cart.items.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.productId.price,
            image: item.productId.images[0], // Assuming first image is main image
            isCanceled: false
        }));

        // Initialize order object
        const orderData = {
            userId,
            orderedId,
            address: {
                name: addressDetails.name,
                phone: addressDetails.phone,
                pincode: addressDetails.pincode,
                locality: addressDetails.locality,
                address: addressDetails.address,
                place: addressDetails.place,
                state: addressDetails.state,
                landmark: addressDetails.landmark || '',
                alternatePhone: addressDetails.alternatePhone || '',
                addressType: addressDetails.addressType
            },
            items: orderItems,
            paymentMethod,
            totalAmount: orderAmount.subtotal,
            payableAmount: orderAmount.payableAmount,
            shippingFee: orderAmount.shippingCost,
            couponDiscount: orderAmount.couponDiscount || 0,
            appliedCoupon: appliedCoupon
        };

        // Handle payment method specific details
        if (paymentMethod === 'cod') {
            orderData.paymentStatus = 'Pending';
            orderData.orderStatus = 'Confirmed';
        }

        else if (paymentMethod === 'razorpay') {
            // Verify Razorpay signature
            if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment details'
                });
            }

            // Add payment details
            orderData.paymentId = razorpayPaymentId;
            orderData.receipt = razorpayOrderId;
            orderData.paymentStatus = 'Paid';
            orderData.orderStatus = 'Confirmed';
            orderData.currency = 'INR';
        }


        else if (paymentMethod === 'wallet') {

            const wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                return res.status(400).json({
                    success: false,
                    message: 'Wallet not found'
                });
            }

            if (wallet.balance < orderAmount.payableAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance'
                });
            }

            wallet.balance -= orderAmount.payableAmount;
            const transaction = {
                amount: orderAmount.payableAmount,
                type: 'Debit',
                description: `Payment for order ${orderedId},`,
                createdAt: new Date(),
            };
            wallet.transactions.push(transaction);
            wallet.updatedAt = new Date();

            // Save the updated wallet
            await wallet.save();

            // Update order details
            orderData.paymentStatus = 'Paid';
            orderData.orderStatus = 'Confirmed';
        }

        // Create new order
        const order = new Order(orderData);
        await order.save();

        // Update coupon usage if applied
        if (appliedCoupon) {
            await Coupon.findOneAndUpdate(
                { couponCode: appliedCoupon },
                { $inc: { usageCount: 1 } }
            );
        }

        // Clear user's cart
        await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [] } }
        );

        // Update product inventory
        await updateProductInventory(orderItems);

        return res.status(200).json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id
        });

    } catch (error) {
        console.error('Error in placeOrderController:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to place order',
            error: error.message
        });
    }
};


const updateProductInventory = async (orderItems) => {
    try {
        // Loop through each item in the order
        for (const item of orderItems) {
            const productId = item.productId;
            const quantity = item.quantity;

            // Find the product and decrement its stock
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error(`Product not found: ${productId}`);
            }

            // Check if there is enough stock
            if (product.stock < quantity) {
                throw new Error(`Insufficient stock for product: ${product.name}`);
            }

            // Decrement the stock
            product.stock -= quantity;

            // Save the updated product
            await product.save();
        }
    } catch (error) {
        console.error('Error updating product inventory:', error);
        throw error; // Re-throw the error to handle it in the calling function
    }
};


const confirmationPage = async (req, res) => {
    const userData = req.session.userData || null;

    if (!userData) {
        return res.redirect("/login");
    }

    try {
        res.render("success", { userData });
    } catch (error) {
        console.error("Error rendering confirmation page:", error);
        res.status(500).json({
            message: "An unexpected error occurred. Please try again later.",
        });
    }
};




const deleteProduct = async (req, res) => {
    try {
        const { cartId, productId } = req.body;
        console.log(req.body);

        if (!cartId || !productId) {
            return res.status(400).send({ success: false, message: 'Cart ID and Product ID are required' });
        }

        const updatedCart = await Cart.findByIdAndUpdate(
            cartId,
            { $pull: { items: { productId } } },
            { new: true }
        );

        if (!updatedCart) {
            return res.status(404).send({ success: false, message: 'Cart not found' });
        }

        return res.status(200).send({ success: true, message: 'Product deleted successfully', updatedCart });
    } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: 'Error deleting product' });
    }
};



// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const initiatePayment = async (req, res) => {
    try {
        const { amount } = req.body;
        console.log(amount)
        const options = {
            amount: amount * 100, // Convert to paise
            currency: "INR",
            receipt: "order_rcptid_" + Date.now(),
        };


        const response = await razorpay.orders.create(options);
        res.json({
            razorpayKey: process.env.RAZORPAY_KEY,
            razorpayOrderId: response.id
        });
    } catch (error) {

        console.error(error);
        res.status(500).json("Razorpay order creation failed");
    }
}


const faildOrder = async (req, res) => {
    try {
        const {
            userId,
            addressDetails,
            paymentMethod,
            orderAmount,
            appliedCoupon,
        } = req.body;


        const orderedId = crypto.randomBytes(8).toString('hex').toUpperCase();

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        const orderItems = cart.items.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.productId.price,
            image: item.productId.images[0], // Assuming first image is main image
            isCanceled: false
        }));

        const orderData = {
            userId,
            orderedId,
            address: {
                name: addressDetails.name,
                phone: addressDetails.phone,
                pincode: addressDetails.pincode,
                locality: addressDetails.locality,
                address: addressDetails.address,
                place: addressDetails.place,
                state: addressDetails.state,
                landmark: addressDetails.landmark || '',
                alternatePhone: addressDetails.alternatePhone || '',
                addressType: addressDetails.addressType
            },
            items: orderItems,
            paymentMethod,
            totalAmount: orderAmount.subtotal,
            payableAmount: orderAmount.payableAmount,
            shippingFee: orderAmount.shippingCost,
            couponDiscount: orderAmount.couponDiscount || 0,
            appliedCoupon: appliedCoupon
        };


        orderData.paymentStatus = 'Failed';
        orderData.orderStatus = 'Pending';


        const order = new Order(orderData);
        await order.save();


        return res.status(200).json({
            success: true,
            message: 'Order status updated to Failed'
        });

    } catch (error) {
        console.error('Error in failed-order:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};























// const verifyPayment = async (req, res) => {
//     try {
//         const {
//             razorpayPaymentId,
//             razorpayOrderId,
//             razorpaySignature,
//             addressDetails,
//             couponCode
//         } = req.body;

//         console.log(req.body);


//         // Verify signature
//         const body = razorpayOrderId + "|" + razorpayPaymentId;
//         const expectedSignature = crypto
//             .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//             .update(body.toString())
//             .digest("hex");

//         if (expectedSignature !== razorpaySignature) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid payment signature"
//             });
//         }

//         // Process the order
//         const cartId = req.session.cart;
//         const cart = await Cart.findById(cartId).populate('items.productId');

//         let totalAmount = 0;
//         const orderItems = [];

//         // Process cart items
//         for (const item of cart.items) {
//             const product = item.productId;

//             // Update product stock
//             product.stock -= item.quantity;
//             await product.save();

//             const itemTotal = product.price * item.quantity;
//             totalAmount += itemTotal;

//             orderItems.push({
//                 productId: product._id,
//                 quantity: item.quantity,
//                 price: product.price,
//                 image: product.images[0],
//                 isCanceled: false
//             });
//         }

//         // Calculate final amount with coupon
//         const shippingFee = 10;
//         let couponDiscount = 0;
//         let payableAmount = totalAmount + shippingFee;

//         if (couponCode) {
//             const coupon = await Coupon.findOne({ couponCode });
//             if (coupon) {
//                 couponDiscount = (totalAmount * coupon.discountPercentage) / 100;
//                 payableAmount -= couponDiscount;
//                 payableAmount = Math.max(payableAmount, totalAmount * 0.1);
//             }
//         }

//         // Create order
//         const orderedId = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
//         const newOrder = new Order({
//             userId: req.session.userData.id,
//             orderedId: orderedId,
//             address: addressDetails,
//             items: orderItems,
//             paymentStatus: 'Completed',
//             paymentMethod: 'netbanking',
//             orderStatus: 'Confirmed',
//             totalAmount: totalAmount,
//             couponDiscount: couponDiscount,
//             shippingFee: shippingFee,
//             payableAmount: payableAmount,
//             appliedCoupon: couponCode || null,
//             razorpayPaymentId,
//             razorpayOrderId
//         });

//         await newOrder.save();
//         await Cart.findByIdAndUpdate(cartId, { $set: { items: [] } });

//         res.json({
//             success: true,
//             message: "Payment verified and order placed successfully",
//             orderId: newOrder._id
//         });

//     } catch (error) {
//         console.error('Error verifying payment:', error);
//         res.status(500).json({
//             success: false,
//             message: "Payment verification failed"
//         });
//     }
// };
module.exports = {
    loadCartpage,
    addtocart,
    updatecart,
    loadCheckoutpage,
    Checkout,
    placeOrder,
    confirmationPage,
    deleteProduct,
    initiatePayment,
    // verifyPayment,
    faildOrder
}
