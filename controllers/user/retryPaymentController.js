const Order = require("../../models/orderSchema");
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const retryPayment= async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const options = {
            amount: order.payableAmount * 100, 
            currency: "INR",
            receipt: "order_rcptid_" + Date.now(),
        };

        const razorpayOrder = await razorpay.orders.create(options);

        res.json({
            success: true,
            razorpayKey: process.env.RAZORPAY_KEY,
            orderId: razorpayOrder.id,
            amount: order.payableAmount * 100,
            currency: "INR"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to initiate payment' });
    }
};

const paymentSuccess= async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const paymentResponse = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.paymentStatus = 'Paid';
        order.orderStatus = 'Confirmed';
        order.paymentId = paymentResponse.razorpay_payment_id;

        await order.save();

        res.json({ success: true, message: 'Payment successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
};

module.exports={retryPayment,paymentSuccess}