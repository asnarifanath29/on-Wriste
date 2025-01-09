const mongoose = require("mongoose");
const { Schema } = mongoose;

// const categorySchema=new mongoose.Schema({
//     name:{
//         type:String,
//         required:true,
//         unique:true
//     },
//     description:{
//         type:String,
//         required:true
//     },
//     isListed:{
//         type:Boolean,
//         default:true
//     },
//     categoryOffer:{
//         type:Number,
//         default:0
//     },
//     createdAt:{
//         type:Date,
//         default:Date.now
//     }
// })
// const categorySchema = new mongoose.Schema({
//     name: String,
//     status: { type: String, enum: ['listed', 'unlisted'], default: 'unlisted' }
// });
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, // Ensures the category name is mandatory
        unique: true, // Ensures no duplicate category names
        trim: true // Removes extra spaces from the name
    },
    description: {
        type: String,
        default: 'No description provided', // Default value if no description is given
        trim: true // Removes extra spaces
    },
    status: {
        type: String,
        enum: ['listed', 'unlisted'], // Limits status values to 'listed' or 'unlisted'
        default: 'unlisted' // Default status
    }
});
const Category = mongoose.model("Category", categorySchema)
module.exports = Category