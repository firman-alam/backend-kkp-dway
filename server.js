import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

import corsOptions from "./config/corsOptions.js"
import { logger } from "./middleware/logEvents.js"
import errorHandler from "./middleware/errorHandler.js"
import verifyJWT from "./middleware/verifyJWT.js"
import credentials from "./middleware/credentials.js"

import userRoute from "./routes/users.js"
import employeeRoute from "./routes/employee.js"
import dataRoute from "./routes/data.js"
import criteriaRoute from "./routes/criteria.js"
import matrixRoute from "./routes/matrix.js"

const PORT = process.env.PORT || 9000
const app = express()

// custom middleware logger
app.use(logger)

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials)

// Cross Origin Resource Sharing
app.use(cors(corsOptions))

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: false }))

// built-in middleware for json
app.use(express.json())

//middleware for cookies
app.use(cookieParser())

//serve static files
app.use("/auth", userRoute)

app.use(verifyJWT)
app.use("/employees", employeeRoute)
app.use("/criteria", criteriaRoute)
app.use("/data", dataRoute)
app.use("/matrix", matrixRoute)

app.use(errorHandler)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
