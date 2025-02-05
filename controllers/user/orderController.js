const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Wallet = require("../../models/walletSchema")


const cancelOrder = async (req, res) => {
    const { orderId } = req.params;
    const { cancelReason } = req.body;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.orderStatus === 'Canceled') {
            return res.status(400).json({ success: false, message: 'Order is already canceled.' });
        }

        order.orderStatus = 'Canceled';
        order.cancelReason = cancelReason;

        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: item.quantity } },
                { new: true }
            );
            item.isCanceled = true;
            item.canceledItems = item.quantity;
        }

        if (order.paymentStatus === 'Paid' && order.paymentMethod !== 'cod') {
            const wallet = await Wallet.findOne({ userId: order.userId });

            if (wallet) {
                wallet.balance += order.payableAmount;
                wallet.transactions.push({
                    amount: order.payableAmount,
                    type: 'Credit',
                    description: `Refund for canceled order ${orderId}`
                });
                wallet.updatedAt = new Date();
                await wallet.save();
            } else {
                const newWallet = new Wallet({
                    userId: order.userId,
                    balance: order.payableAmount,
                    transactions: [
                        {
                            amount: order.payableAmount,
                            type: 'Credit',
                            description: `Refund for canceled order ${orderId}`
                        }
                    ]
                });
                await newWallet.save();
            }
            order.paymentStatus = "Refunded"
        }

        await order.save();
        res.status(200).json({ success: true, message: 'Order canceled successfully, stock updated, and refund processed if applicable.' });
    } catch (error) {
        console.error('Error canceling order:', error);
        res.status(500).json({ success: false, message: 'An error occurred while canceling the order.' });
    }
};


const returnOrder = async (req, res) => {
    const { orderId } = req.params;
    const { returnReason } = req.body;

    try {

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        if (order.orderStatus === 'Returned') {
            return res.status(400).json({ success: false, message: 'Order is already returned.' });
        }

        order.orderStatus = 'Delivered';
        order.returnReason = returnReason;

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order returned successfully, and stock updated.',
        });
    } catch (error) {
        console.error('Error processing return:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing the return.',
        });
    }
};


module.exports = { cancelOrder, returnOrder }