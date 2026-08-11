import express from 'express'
import { aiController } from '../controllers/aiController.js'

const router = express.Router()

router.post('/chat', aiController.chat)
router.post('/speech', aiController.speech)

export default router
