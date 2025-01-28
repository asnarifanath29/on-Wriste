const mongoose = require("mongoose");
const { search } = require("../app");
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique:true
    },
    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleId:{
        type:String,
        unique:true
    },
    password: {
        type: String,
        required: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    cart: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart',
    },

    usedCoupons: [{
        couponId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Coupon' 
        },
        usedAt: { 
            type: Date, 
            default: Date.now 
        }
    }],
    referralCode:{type:String,unique:true},
    referredBy:{type:mongoose.Schema.Types.ObjectId,ref:'users'},
    referralCount:{type:Number,default:0}

});

async function generateUniqueCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 8;
    let isUnique = false;
    let code;

    while (!isUnique) {
        // Generate a random code
        code = '';
        for (let i = 0; i < codeLength; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters[randomIndex];
        }

        // Check if the code exists in the database
        const existingUser = await mongoose.model('users').findOne({ referralCode: code });
        if (!existingUser) {
            isUnique = true;
        }
    }

    console.log('Generated referral code:', code);
    return code;
}

// Add pre-save middleware to generate referralCode
userSchema.pre('save', async function (next) {
    if (!this.referralCode) {
        this.referralCode = await generateUniqueCode();
    }
    next();
});



const User = mongoose.model("users", userSchema)
module.exports = User
