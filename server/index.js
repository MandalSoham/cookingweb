const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cooking-assistant', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error:', err));

// Recipe Schema
const recipeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    ingredients: [String],
    steps: [String],
    category: String,
    cuisine: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
});

const Recipe = mongoose.model('Recipe', recipeSchema);

// Routes
app.get('/api/recipes', async (req, res) => {
    try {
        const { search, cuisine, category } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { ingredients: { $regex: search, $options: 'i' } }
            ];
        }

        if (cuisine) {
            query.cuisine = { $regex: cuisine, $options: 'i' };
        }

        if (category) {
            query.category = { $regex: category, $options: 'i' };
        }

        const recipes = await Recipe.find(query);
        res.json(recipes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/recipes/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
        res.json(recipe);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/recipes', async (req, res) => {
    const recipe = new Recipe(req.body);
    try {
        const newRecipe = await recipe.save();
        res.status(201).json(newRecipe);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 