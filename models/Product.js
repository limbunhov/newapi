const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productID: { type: Number, unique: true },
    name: String,
    title: {
    t1: String,
    t2: String,
    t3: String,
    t4: String,
    t5: String,
    },
    price: String,
    image: String,
    model: String,
    year: String,
    type: String,
});


productSchema.pre('save', async function (next) {
    if (!this.productID) {
      try {
        const lastProduct = await mongoose.model('Product').findOne({}, {}, { sort: { 'productID': -1 } });
        const newProductID = lastProduct ? lastProduct.productID + 1 : 1;
        this.productID = newProductID;
      } catch (error) {
        return next(error);
      }
    }
    next();
  });


const Product = mongoose.model('Product', productSchema);

module.exports = Product;
