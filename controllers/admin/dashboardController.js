
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Category=require('../../models/categorySchema');
const mongoose = require('mongoose');



const loadDashboard = async (req, res) => {
    try {
        // Fetch best-selling products (excluding Returned and Canceled orders)
        const bestProducts = await Order.aggregate([
            { 
                $match: { 
                    orderStatus: { 
                        $nin: ["Returned", "Canceled"] // Exclude Returned and Canceled orders
                    } 
                } 
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    totalOrders: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalOrders: -1 } },
            { $limit: 10 }
        ]);

        const productDetails = await Product.populate(bestProducts, { path: '_id', select: 'name' });

        const formattedProducts = productDetails.map(product => ({
            name: product._id.name,
            orderCount: product.totalOrders
        }));

        // Fetch best-selling categories (excluding Returned and Canceled orders)
        const bestCategories = await Order.aggregate([
            { 
                $match: { 
                    orderStatus: { 
                        $nin: ["Returned", "Canceled"] // Exclude Returned and Canceled orders
                    } 
                } 
            },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.category",
                    totalOrders: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalOrders: -1 } },
            { $limit: 10 }
        ]);

        const categoryDetails = await Category.populate(bestCategories, { path: '_id', select: 'name' });

        const formattedCategories = categoryDetails.map(category => ({
            name: category._id.name,
            orderCount: category.totalOrders
        }));

        // Fetch best-selling brands (excluding Returned and Canceled orders)
        const bestBrands = await Order.aggregate([
            { 
                $match: { 
                    orderStatus: { 
                        $nin: ["Returned", "Canceled"] // Exclude Returned and Canceled orders
                    } 
                } 
            },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.brand",
                    totalOrders: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalOrders: -1 } },
            { $limit: 10 }
        ]);

        const formattedBrands = bestBrands.map(brand => ({
            name: brand._id,
            orderCount: brand.totalOrders
        }));

        // Render the dashboard view with the fetched data
        return res.render("dashboard", {
            bestProducts: formattedProducts,
            bestCategories: formattedCategories,
            bestBrands: formattedBrands
        });

    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.status(500).send("Server error");
    }
};





const salesData = async (req, res) => {
    try {
        const { range, startDate, endDate } = req.query;

        // Validate the range parameter
        if (!['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(range)) {
            return res.status(400).json({ message: 'Invalid range parameter' });
        }

        // Calculate the date range
        let dateRange;
        if (range === 'custom') {
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required for custom range' });
            }
            dateRange = { start: new Date(startDate), end: new Date(endDate) };
        } else {
            dateRange = getDateRange(range);
        }

        // Fetch sales data from the database
        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                    orderStatus: { $nin: ["Returned", "Canceled"] } // Exclude canceled/returned orders
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by day
                    totalSales: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } } // Sort by date
        ]);

        // Send the response
        res.status(200).json(salesData);
    } catch (error) {
        console.error("Error fetching sales data:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Helper function to calculate date ranges
const getDateRange = (range) => {
    const now = new Date();
    switch (range) {
        case 'daily':
            return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date(now.setHours(23, 59, 59, 999)) };
        case 'weekly':
            return { start: new Date(now.setDate(now.getDate() - now.getDay())), end: new Date(now.setDate(now.getDate() - now.getDay() + 6)) };
        case 'monthly':
            return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
        case 'yearly':
            return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
        default:
            return { start: new Date(0), end: new Date() }; // All time
    }
};
module.exports = { loadDashboard , salesData };