const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
    username: {
        type: String, required: true
    },
    email: {
        type: String, required: true
    },
    password: {
        type: String, required: true
    },
    id: {
        type: String
    },
    statistics: {
        // [0] - easy, [1] - medium, [2] - hard, [3] - extreme
        type: [{
            gamesPlayed: { type: Number, default: 0 },
            totalTime: { type: Number, default: 0 },  // total time in seconds
            bestTime: { type: Number, default: 0 }    // best time in seconds
        }],
        default: [{ gamesPlayed: 0, totalTime: 0, bestTime: 0 }, { gamesPlayed: 0, totalTime: 0, bestTime: 0 }, { gamesPlayed: 0, totalTime: 0, bestTime: 0 }, { gamesPlayed: 0, totalTime: 0, bestTime: 0 }]
    }
})

const User = mongoose.model('User', userSchema)

module.exports = User
