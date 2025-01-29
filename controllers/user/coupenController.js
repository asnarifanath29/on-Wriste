const Coupon = require("../../models/coupenSchema");
const User = require("../../models/userSchema")
const mongoose = require('mongoose');

// Get available coupons
const availableCoupen=  async (req, res) => {
    try {
        const currentDate = new Date();
        const validCoupons = await Coupon.find({
            status: true,
            isDeleted: false,
            validFrom: { $lte: currentDate },
            validUpto: { $gte: currentDate }
        });
        res.json(validCoupons);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching coupons' });
    }
};

// Apply coupon
const applyCoupen=  async (req, res) => {
    try {
        const { couponCode, subtotal } = req.body;
        // const userId = req.user.id; // Assuming authenticated user
        const userId = req.session.userData.id
        // Find coupon
        const coupon = await Coupon.findOne({ 
            couponCode, 
            status: true, 
            isDeleted: false 
        });

        if (!coupon) {
            return res.status(404).json({ 
                success: false, 
                message: 'Invalid coupon' 
            });
        }

        // Check coupon validity
        const currentDate = new Date();
        if (currentDate < coupon.validFrom || currentDate > coupon.validUpto) {
            return res.status(400).json({ 
                success: false, 
                message: 'Coupon has expired' 
            });
        }

        // Check minimum price requirement
        if (subtotal < coupon.minPrice) {
            return res.status(400).json({ 
                success: false, 
                message: `Minimum order value for this coupon is ₹${coupon.minPrice}` 
            });
        }

        // Check coupon usage count
        if (coupon.couponCount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Coupon limit reached' 
            });
        }

        // Check if user has already used this coupon
        const userUsedCoupon = await User.findOne({
            _id: userId,
            'usedCoupons.couponId': coupon._id
        });

        if (userUsedCoupon) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already used this coupon' 
            });
        }

        // Calculate discount
        let discountAmount = (subtotal * coupon.discountPercentage / 100);
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);

        // Update coupon usage
        coupon.couponCount -= 1;
        await coupon.save();

        // Update user's used coupons
        await User.findByIdAndUpdate(userId, {
            $push: { 
                usedCoupons: { 
                    couponId: coupon._id, 
                    usedAt: new Date() 
                } 
            }
        });

        res.json({ 
            success: true, 
            discountAmount,
            message: 'Coupon applied successfully' 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: 'Error applying coupon' 
        });
    }
};


module.exports = { availableCoupen,applyCoupen};
