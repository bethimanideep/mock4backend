const mongoose = require('mongoose');
require("dotenv").config()
const connection=mongoose.connect(process.env.mongodb)


const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
  },{versionKey:false}));
  
const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({
    name: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    menu: [{
      name: String,
      description: String,
      price: Number,
      image: String,
    }],
  },{versionKey:false}));
  
const Order = mongoose.model('Order', new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    items: [{
      name: String,
      price: Number,
      quantity: Number,
    }],
    totalPrice: Number,
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    status: String,
},{versionKey:false}));

module.exports={
    connection,
    User,Restaurant,Order
}
