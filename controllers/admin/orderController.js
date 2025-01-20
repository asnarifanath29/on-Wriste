const mongoose = require("mongoose")
const Order = require("../../models/orderSchema");
const Product=require("../../models/productSchema")




const getOrderPage = async (req, res) => {
    
    try {
        const orders = await Order.find()
            .populate('items.productId') 
            .exec();
            

          
            orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by createdAt descending
           
            
        res.render("order", {
            orders: orders
        });
    }
    catch (error) {
        console.error("Error loading profile page:", error);
        res.redirect("/pageNotFound");
    }
};





// const updateOrderStatus = async (req, res) => {
//     try {
//         const { orderId, newStatus } = req.body;

//         // Validate the new status
//         const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Canceled', 'Returned'];
//         if (!validStatuses.includes(newStatus)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Invalid status value'
//             });
//         }

//         // Update the order in the database
//         const updatedOrder = await Order.findByIdAndUpdate(
//             orderId,
//             { orderStatus: newStatus },
//             { new: true, runValidators: true }
//         );

//         if (!updatedOrder) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Order not found'
//             });
//         }

//         res.json({
//             success: true,
//             order: updatedOrder
//         });

//     } catch (error) {
//         console.error('Error updating order status:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Internal server error'
//         });
//     }
// };



const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;

        // Validate the new status
        const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Canceled', 'Returned'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value',
            });
        }

        // Find the order by ID
        const order = await Order.findById(orderId).populate('items.productId');
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        // Handle stock update when the order is canceled
        if (newStatus === 'Canceled') {
            for (const item of order.items) {
                const product = item.productId;
                if (product) {
                    product.stock += item.quantity; // Increment the stock by the ordered quantity
                    await product.save(); // Save the updated product
                }
            }
        }

        // Update the order status in the database
        order.orderStatus = newStatus;
        await order.save();

        res.json({
            success: true,
            order,
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};


module.exports = { getOrderPage ,updateOrderStatus}