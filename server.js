const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');

// Import Schema
const User = require('./models/User');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const Favorite = require('./models/Favorite');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());


const mongoURI = 'mongodb+srv://limbunhov:12013456@cluster0.sedx4tq.mongodb.net/testDB?retryWrites=true&w=majority';
mongoose.connect(mongoURI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.post('/products', async (req, res) => {
  // Access request body using req.body
  const { name, title, price, image, model, year,type } = req.body;
  const { t1, t2, t3, t4, t5 } = title;


  try {
    const newProduct = new Product({
      name: name,
      title:{
      t1: t1,
      t2: t2,
      t3: t3,
      t4: t4,
      t5: t5
      }, price: price, image: image, model: model, year: year, type: type,
    });
    await newProduct.save();
    res.json({ message: 'Product added successful!' });
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/products', async (req, res) => {
  try {
    let query = {
      $or: [
        { 'title.t1': new RegExp(req.query.search, 'i') },
        { 'title.t2': new RegExp(req.query.search, 'i') },
        { 'title.t3': new RegExp(req.query.search, 'i') },
        { 'title.t4': new RegExp(req.query.search, 'i') },
        { 'title.t5': new RegExp(req.query.search, 'i') },
        // ... Add other fields as needed ...
      ],
    }

    let sort = {};
    if (req.query.sort) {
      // Set the sort field based on the value of req.query.sort
      sort[req.query.sort] = 1; // You can also use -1 for descending order
    }

    const products = await Product.find(query).sort(sort);

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Example route for updating a product
app.put('/products/:productId', async (req, res) => {
  const productID = req.params.productId; // Fix: use params, not body
  const updatedProductData = req.body;

  try {
    // Validate if productId is a valid ObjectId before attempting to update
    if (!mongoose.Types.ObjectId.isValid(productID)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // Use Mongoose to update the product by ID
    const updatedProduct = await Product.findByIdAndUpdate(
      productID,
      { $set: updatedProductData },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Example route for deleting a product
app.delete('/products/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    // Use Mongoose or your preferred method to delete the product by ID
    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Cascade deletion in other collections
    await Favorite.deleteMany({ product: productId });
    await Cart.deleteMany({ product: productId });
    await Order.deleteMany({ product: productId });

    return res.json({ message: 'Product deleted successfully', product: deletedProduct });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/add-to-cart', async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    // Check if productId and userId are provided
    if (!productId || !userId) {
      return res.status(400).json({ error: 'productId and userId are required' });
    }

    let cartItem = await Cart.findOne({ user: userId, product: productId });

    if (cartItem) {
      // If the product is already in the cart, increase its quantity
      cartItem.quantity += quantity;
    } else {
      // If the product is not in the cart, add it with the specified quantity
      cartItem = new Cart({ user: userId, product: productId, quantity });
    }

    // Save the cart item
    await cartItem.save();

    res.status(201).json({ message: 'Item added to cart successfully' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/cart/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Fetch cart items based on userId
    const cartItems = await Cart.find({ user: userId });

    // Extract product IDs from cart items
    const productIds = cartItems.map(cartItem => cartItem.product);

    // Fetch details of each product using the product IDs
    const products = await Product.find({ _id: { $in: productIds } });

    // Combine cart items with product details
    const cartWithDetails = cartItems.map(cartItem => {
      const productDetail = products.find(product => product._id.equals(cartItem.product));
      return {
        cartItem,
        productDetail,
      };
    });

    // Send the combined data as a JSON response
    res.status(200).json(cartWithDetails);
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/cart/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Delete all cart items for the specified user
    await Cart.deleteMany({ user: userId });

    res.status(200).json({ message: 'Cart cleared successfully!' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add this API endpoint in your Express server
app.put('/cart/:userId/:productId', async (req, res) => {
  try {
      const productId = req.params.productId;
      const userId = req.params.userId;
      const { quantity } = req.body;

      console.log('Updating quantity for product:', productId, 'in user cart:', userId);

      // Use findOneAndUpdate to update the quantity in the cart array
      await Cart.findOneAndUpdate(
          { user: userId, product: productId },
          { $set: { quantity } },
          { new: true }
      );

      // Respond with the updated cart
      res.status(200).json({ message: 'Quantity updated successfully!' });
  } catch (error) {
      console.error('Error updating quantity for product in the cart:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.delete('/cart/:userId/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.params.userId;
    console.log('Removing product:', productId, 'from user cart:', userId);

    // Use findOneAndUpdate with $pull to remove the product from the cart array
    await Cart.deleteOne({ user: userId, product: productId});
    
    // Respond with the updated cart
    res.status(200).json({ message: 'Cart cleared successfully!' });
  } catch (error) {
    console.error('Error removing product from the cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/orders/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const orderItems = req.body.orderItems;

    // Iterate over each item in the orderItems array
    for (const item of orderItems) {
      // Calculate the total price for the current item
      const totalPrice = item.price * item.quantity;

      // Create a new order document for the current item
      const order = new Order({
        user: userId,
        product: item.product,
        quantity: item.quantity,
        totalPrice: totalPrice,
      });

      // Save the order to the database
      await order.save();
    }

    // Optionally, you can also remove the ordered items from the user's cart here

    res.status(201).json({ message: 'Order placed successfully!' });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//Get product by user ID
app.get('/orders/:userId', async (req, res) => {
  try {
    const userId = req.params.userId; // Assuming user information is stored in req.user
    const orders = await Order.find({ user: userId }).populate('product');
    // const orders = await Order.find({ user: userId }).populate('items.product');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Assuming you have a route like '/orderedItems' for fetching all ordered items
app.get('/orderedItems', async (req, res) => {
  try {
    // Fetch all orders from the Order model and populate the 'user' and 'product' fields
    const orderedItems = await Order.find().populate('user product');

    // Send the ordered items as a response
    res.status(200).json(orderedItems);
  } catch (error) {
    console.error('Error fetching ordered items:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Order status
app.put('/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status, adminComments } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status, adminComments } },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Notify user about order status
    // You can use a messaging service, email, or other notification method here

    return res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/add/favorites', async (req, res) => {
  try {
    const { userId, productId } = req.body;

    // Check if productId and userId are provided
    if (!productId || !userId) {
      return res.status(400).json({ error: 'productId and userId are required' });
    }

    // Check if the product is already in favorites
    let favoriteItem = await Favorite.findOne({ user: userId, product: productId });

    if (!favoriteItem) {
      // If the product is not in favorites, add it
      favoriteItem = new Favorite({ user: userId, product: productId });
    } else {
      // If the product is already in favorites, handle it as needed (e.g., show a message)
      return res.status(200).json({ message: 'Product already in favorites' });
    }

    // Save the favorite item
    await favoriteItem.save();

    res.status(201).json({ message: 'Item added to favorites successfully' });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/favorites/:userId', async (req, res) => {
  try {
    const user = req.params.userId;

    // Fetch the user's favorite data based on userId
    const favorites = await Favorite.find({ user }).populate('product'); // Assuming 'productId' is the field you reference in the Favorite schema

    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.delete('/favorites/:userId/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.params.userId;
    console.log('Removing product:', productId, 'from user favorite:', userId);

    // Use findOneAndUpdate with $pull to remove the product from the cart array
    const hello = await Favorite.deleteOne({ user: userId, product: productId});
    
    console.log(hello);
    // Respond with the updated cart
    res.status(200).json({ message: 'Cart cleared successfully!' });
  } catch (error) {
    console.error('Error removing product from the cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route for handling registration
app.post('/register', async (req, res) => {
  // Access request body using req.body
  const { fullName, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  // Add your registration logic here, such as saving to the database
  try {
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });
    await newUser.save();
    res.json({ message: 'Registration successful!' });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate and send JWT on successful login
    const token = generateToken(user);
    res.json({ token, userId: user._id });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/logout', (req, res) => {
  // Handle logout logic here
  res.status(200).send('Logout successful');
});
app.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(userId);
    // Find user by userID
    const user = await User.findOne({ _id: userId });
    console.log(user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user data
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/role/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
      const user = await User.findOne({ _id: userId });
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      res.json({ role: user.role });
  } catch (error) {
      console.error('Error fetching user role:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

function generateToken(user) {
  // Example:
  const token = jwt.sign({ userId: user._id, email: user.email }, 'secret', { expiresIn: '1h' });
  return token;
}

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Missing Token' });
  }

  jwt.verify(token.replace('Bearer ', ''), 'secret', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized - Invalid Token' });
    }

    req.user = decoded;
    next();
  });
};

app.get('/protected-route', verifyToken, (req, res) => {
  const user = req.user;
  res.json({ message: 'Protected route accessed', user });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
