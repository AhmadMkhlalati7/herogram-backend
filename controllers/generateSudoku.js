const mongoose = require('mongoose');
const User = require('../models/user'); // Ensure this path is correct

const getSudokuGrid = async (req, res) => {
    const size = 3; // size of the little squares (main grid will be 9x9)
    let sudokuGrid = new Array(size * size); // main grid
    let availableNumbers = new Array(Math.pow(size, 4)); // availableNumbers to put in each cell
    let solutionsCount = { val: 0 }; // Define solutionsCount here

    const allNumbers = new Array(size * size).fill(0).map((_, idx) => idx + 1); // array with all possible numbers you can play with

    for (let i = 0; i < sudokuGrid.length; i++) {
        sudokuGrid[i] = Array(size * size).fill(0); // initialize every cell to 0 (means empty)
    }

    for (let i = 0; i < availableNumbers.length; i++) {
        availableNumbers[i] = allNumbers.slice(); // every cell, at the beginning, could have every number in it
    }

    const createSudoku = (grid) => {
        let pos = 0;

        while (pos < Math.pow(size, 4)) {
            let [row, col] = coordinatesOfPos(pos);

            if (availableNumbers[pos].length === 0) { // if no more numbers are available for the cell
                grid[row][col] = 0;
                availableNumbers[pos] = allNumbers.slice();
                pos--;
            } else { // if numbers are still available for that cell
                let newNumber;
                while (availableNumbers[pos].length > 0) {
                    newNumber = availableNumbers[pos][Math.floor(Math.random() * availableNumbers[pos].length)];
                    if (numberIsValid(pos, newNumber, grid)) {
                        break;
                    } else {
                        const numIndex = availableNumbers[pos].indexOf(newNumber);
                        availableNumbers[pos].splice(numIndex, 1);
                    }
                }

                if (availableNumbers[pos].length === 0) {
                    // if no valid number is found, the loop will restart and it will backtrack
                } else {
                    grid[row][col] = newNumber;

                    const numIndex = availableNumbers[pos].indexOf(newNumber);
                    const av = availableNumbers[pos].slice();
                    av.splice(numIndex, 1);
                    availableNumbers[pos] = av;

                    pos++;
                }
            }
        }
        return grid;
    };

    const coordinatesOfPos = (pos) => {
        return [Math.floor(pos / (size * size)), pos % (size * size)]; // [row, col]
    };

    const numberIsValid = (pos, num, grid) => {
        let [row, col] = coordinatesOfPos(pos);
        for (let i = 0; i < size * size; i++) {
            if (i !== col && grid[row][i] === num) {
                return false;
            }
            if (i !== row && grid[i][col] === num) {
                return false;
            }
        }

        let squareCol = Math.floor(col / size) * size;
        let squareRow = Math.floor(row / size) * size;

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                let tempRow = (squareRow) + i;
                let tempCol = (squareCol) + j;
                if (tempRow !== row || tempCol !== col) {
                    if (grid[tempRow][tempCol] === num) {
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const createGridWithBlanks = (completeSudoku) => {
        const numbersToDelete = calculateNumbersToDelete();

        let gridWithBlanks = new Array(size * size);
        for (let i = 0; i < size * size; i++) {
            gridWithBlanks[i] = new Array(size * size);
            for (let j = 0; j < size * size; j++) {
                gridWithBlanks[i][j] = completeSudoku[i][j];
            }
        }

        let shuffledPositions = new Array(Math.pow(size, 4)).fill(0).map((_, idx) => idx);
        shuffleArray(shuffledPositions);

        let k = 0;
        let deletedNumbers = 0;

        while (k < Math.pow(size, 4) && deletedNumbers < numbersToDelete) {
            let [row, col] = coordinatesOfPos(shuffledPositions[k]);
            let prevNum = gridWithBlanks[row][col];
            gridWithBlanks[row][col] = 0;

            solveIsUnique(gridWithBlanks);

            if (solutionsCount.val < 2) {
                deletedNumbers++;
            } else {
                gridWithBlanks[row][col] = prevNum;
            }
            solutionsCount.val = 0;
            k++;
        }
        return gridWithBlanks;
    };

    const calculateNumbersToDelete = () => {
        switch (req.query.mode) {
            case "easy":
                return Math.floor(Math.random() * 8 + 40);
            case "medium":
                return Math.floor(Math.random() * 5 + 45);
            case "hard":
                return Math.floor(Math.random() * 5 + 50);
            case "extreme":
                return Math.floor(Math.random() * 5 + 55);
            default:
                return Math.floor(Math.random() * 8 + 40);
        }
    };

    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    };

    const solveIsUnique = (grid) => {
        let length = size * size;

        for (let i = 0; i < length; i++) {
            for (let j = 0; j < length; j++) {
                if (grid[i][j] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (numberIsValid(i * length + j, num, grid) && solutionsCount.val < 2) {
                            grid[i][j] = num;
                            solveIsUnique(grid);
                            grid[i][j] = 0;
                        }
                    }
                    return;
                }
            }
        }
        solutionsCount.val++;
    };

    // Generate the complete Sudoku grid
    sudokuGrid = createSudoku(sudokuGrid);

    // Create the grid with blanks
    const gridWithBlanks = createGridWithBlanks(sudokuGrid);

    // Get the best time asynchronously
    try {
        const bestTimeResult = await getBestTime(req.query.mode);
        res.status(200).json({ grid: sudokuGrid, gridWithBlanks, gridToBeFilled: gridWithBlanks, bestTime: bestTimeResult });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve best time' });
    }
};

const getBestTime = async (mode) => {
    try {
        const modeIndex = ["easy", "medium", "hard", "extreme"].indexOf(mode);
        
        if (modeIndex === -1) {
            throw new Error('Invalid mode');
        }

        const result = await User.aggregate([
            {
                $project: {
                    username: 1,
                    email: 1,
                    statistics: 1,
                    modeStatistics: { $arrayElemAt: ["$statistics", modeIndex] } // Extract the statistics for the specific mode index
                }
            },
            {
                $addFields: {
                    minBestTime: {
                        $cond: {
                            if: { $gt: ["$modeStatistics.bestTime", 0] },
                            then: "$modeStatistics.bestTime",
                            else: null
                        }
                    }
                }
            },
            {
                $match: {
                    minBestTime: { $ne: null } // Ensure only non-null minBestTime values are considered
                }
            },
            {
                $group: {
                    _id: null,
                    minBestTime: { $min: "$minBestTime" } // Find the minimum bestTime across all documents
                }
            },
            { $sort: { minBestTime: 1 } }, // Sort to get the smallest bestTime first
            { $limit: 1 } // Limit to the smallest bestTime
        ]);

        if (result.length === 0) {
            return "No best time found for this mode.";
        }
        return  result[0].minBestTime;

    } catch (error) {
        return "Something went wrong while retrieving best time.";
    }
        
};




module.exports = {
    getSudokuGrid
};
