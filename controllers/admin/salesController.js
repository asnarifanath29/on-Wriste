const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");



const getSalesReport = async (req, res) => {
    try {

        // Default to showing orders for the current month
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const query = {
            orderDate: { $gte: currentMonth }
        };

        const orders = await Order.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    orderDate: 1,
                    orderId: 1,
                    customerName: '$user.name',
                    subtotal: 1,
                    couponDiscount: 1,
                    offerDiscount: { $subtract: ['$subtotal', '$totalAmount'] },
                    totalAmount: 1,
                    orderStatus: 1
                }
            }
        ]);

        const summaryMetrics = {
            totalSales: orders.reduce((sum, order) => sum + order.subtotal, 0),
            totalOrders: orders.length,
            totalDiscounts: orders.reduce((sum, order) => sum + order.couponDiscount, 0),
            netRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0)
        };

        res.render("salesReport", { 
            summaryMetrics, 
            orders,
            reportType: 'monthly'
        });
    } catch(error) {
        console.error(error);
        res.status(500).render("error", { message: 'Failed to fetch sales report.' });
    }
}

const generateReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;

        let query = {};

        switch(type) {
            case 'daily':
                query.createdAt= {
                    $gte: new Date(new Date().setHours(0,0,0,0)),
                    $lt: new Date(new Date().setHours(23,59,59,999))
                };
                break;
            case 'weekly':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                query.createdAt = { $gte: weekAgo };
                break;
            case 'monthly':
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                query.createdAt = { $gte: monthAgo };
                break;
            case 'yearly':
                const yearAgo = new Date();
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                query.createdAt = { $gte: yearAgo };
                break;
            case 'custom':
                if (startDate && endDate) {
                    query.createdAt = {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    };
                }
                break;
        }

        const orders = await Order.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    createdAt: 1,
                    orderedId: 1,
                    customerName: '$user.name',
                    totalAmount: 1,
                    couponDiscount: 1,
                    offerDiscount: 1,
                    // { $subtract: ['$totalAmount', '$payableAmount'] },
                    payableAmount: 1,
                    orderStatus: 1
                }
            }
        ]);

        const summaryMetrics = {
            totalSales: orders.reduce((sum, order) => sum + order.totalAmount, 0),
            totalOrders: orders.length,
            totalDiscounts: orders.reduce((sum, order) => sum + order.couponDiscount, 0),
            netRevenue: orders.reduce((sum, order) => sum + order.payableAmount, 0)
        };

        res.render("salesReport", { 
            summaryMetrics, 
            orders,
            reportType: type
        });
    } catch(error) {
        console.error(error);
        res.status(500).render("error", { message: 'Failed to fetch sales report.' });
    }
}


module.exports = { getSalesReport, generateReport };
