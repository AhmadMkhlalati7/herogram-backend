const User = require("../models/user")

const updateMyStatistics = async (req, res) => {
    try {
        let mode = req.body.mode === "easy" ? 0 : req.body.mode === "medium" ? 1 : req.body.mode === "hard" ? 2 : req.body.mode === "extreme" ? 3 : 0
        let { username } = res.locals.jwtPayload
        let { timeElapsed } = req.body  // time elapsed in seconds

        let user = await User.findOne({ username })
        if (!user) return res.status(500).json({ message: "Something went wrong" })

        let newStats = user.statistics.slice()
        let currentStats = newStats[mode]

        currentStats.gamesPlayed++
        // Update totalTime and bestTime
        currentStats.totalTime += timeElapsed
        if (currentStats.bestTime === 0 || timeElapsed < currentStats.bestTime) {
            currentStats.bestTime = timeElapsed
        }

        newStats[mode] = currentStats

        const result = await User.updateOne({ username }, { statistics: newStats })

        return res.status(200).json({ message: "Statistics updated" })

    } catch (error) {
        return res.status(500).json({ message: "Something went wrong in statistics update" })
    }
}


const getMyStatistics = async (req, res) => {
    try {
        let {username} = res.locals.jwtPayload

        let user = await User.findOne({username})
        if(!user) return res.status(404).json({message: "User doesn't exist"})

        let myStatistics = user.statistics.slice()
        return res.status(200).json({myStatistics})
    } catch (error) {
        return res.status(500).json({message: "Something went wrong"})
    }
}

module.exports = {
    updateMyStatistics,
    getMyStatistics
}