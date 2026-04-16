import express from "express"
import { getDatas } from './data.controller'


const router = express.Router();

router.get('/', getDatas)

export default router;