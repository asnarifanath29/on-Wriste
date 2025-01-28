const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, 
        unique: true,
        trim: true 
    },
    description: {
        type: String,
        default: 'No description provided',
        trim: true
    },
    status: {
        type: String,
        enum: ['listed', 'unlisted'],
        default: 'unlisted'
    },
    offer:{
        type:Number
    },
    offerApplied:{
        type:Boolean,
        default:false
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    createdAt: { type: Date, default: Date.now }, 
    updatedAt: { type: Date, default: Date.now }, 

});
const Category = mongoose.model("Category", categorySchema)
module.exports = Category