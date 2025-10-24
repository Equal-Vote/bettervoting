import { Router } from 'express';
import {
    addElectionRoll,
    registerVoter,
    getRollsByElectionID,
    getByVoterID,
    editElectionRoll,
    approveElectionRoll,
    flagElectionRoll,
    invalidateElectionRoll,
    uninvalidateElectionRoll,
    revealVoterIdByEmail
} from '../Controllers/Roll';
import {
    getElectionByID,
    electionSpecificAuth,
    electionPostAuthMiddleware
} from '../Controllers/Election';

import asyncHandler  from 'express-async-handler';
export const rollRouter = Router();


/** 
 * @swagger
 * /Election/{id}/register:
 *   post:
 *     summary: Register a voter for an election
 *     tags: [Rolls]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     responses:
 *       200:
 *         description: Voter registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   $ref: '#/components/schemas/Election'
 *                 NewElectionRoll:
 *                   type: object
 *                   $ref: '#/components/schemas/ElectionRoll'
 *       404:
 *         description: Election not found
 */
rollRouter.post('/Election/:id/register',asyncHandler(registerVoter))

/** 
 * @swagger
 * /Election/{id}/rolls:
 *   get:
 *     summary: Get rolls by election ID
 *     tags: [Rolls]
 *     security:
 *      - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     responses:
 *       200:
 *         description: List of rolls
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 electionRollEntry:
 *                   type: object
 *                   $ref: '#/components/schemas/ElectionRoll'
 *       404:
 *         description: Election not found 
*/
rollRouter.get('/Election/:id/rolls', asyncHandler(getRollsByElectionID))

/** 
 * @swagger
 * /Election/{id}/rolls/{voter_id}:
 *   get:
 *     summary: Get roll by voter ID
 *     tags: [Rolls]
 *     security:
 *      - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *       - in: path
 *         name: voter_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The voter ID
 *     responses:
 *       200:
 *         description: Roll details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 electionRollEntry:
 *                   type: object
 *                   $ref: '#/components/schemas/ElectionRoll'
 *       404:
 *         description: Roll not found 
*/
rollRouter.get('/Election/:id/rolls/:voter_id', asyncHandler(getByVoterID))

/** 
 * @swagger
 * /Election/{id}/rolls:
 *   post:
 *     summary: Add a list of rolls to an election
 *     tags: [Rolls]
 *     security:
 *      - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     requestBody:
 *      required: true
 *      content:
 *       application/json:
 *         schema:
 *          type: object
 *          properties:
 *           electionRoll: 
 *             type: array
 *             items:
 *                 type: object
 *                 $ref: '#/components/schemas/ElectionRoll'
 *     responses:
 *       200:
 *         description: Rolls added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   $ref: '#/components/schemas/Election'
 *                 NewElectionRoll:
 *                   type: object
 *                   $ref: '#/components/schemas/ElectionRoll'
 *       404:
 *         description: Election not found
 */
rollRouter.post('/Election/:id/rolls/', asyncHandler(addElectionRoll))

/** 
 * @swagger
 * /Election/{id}/rolls:
 *   put:
 *     summary: Edit an election roll
 *     tags: [Rolls]
 *     security:
 *      - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     responses:
 *       200:
 *         description: Roll edited
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 electionRollEntry:
 *                   type: object
 *                   $ref: '#/components/schemas/ElectionRoll'
 *       404:
 *         description: Election not found */
rollRouter.put('/Election/:id/rolls/', asyncHandler(editElectionRoll))

 /** 
 * @swagger
 * /Election/{id}/rolls/approve:
 *   post:
 *     summary: Approve an election roll
 *     tags: [Rolls]
 *     security:
 *      - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     requestBody:
 *       required: true
 *       content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 electionRollEntry:
 *                   type: object
 *                   $ref: '#/components/schemas/ElectionRoll'
 *     responses:
 *       200:
 *         description: Roll approved
 *       404:
 *         description: Election not found */
 rollRouter.post('/Election/:id/rolls/approve', asyncHandler(approveElectionRoll))

 /** 
 * @swagger
 * /Election/{id}/rolls/flag:
 *   post:
 *     summary: Flag an election roll
 *     tags: [Rolls]
 *     security:
 *      - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               electionRollEntry:
 *                 type: object
 *                 $ref: '#/components/schemas/ElectionRoll' 
 *     responses:
 *       200:
 *         description: Roll flagged
 *       404:
 *         description: Election not found */
 rollRouter.post('/Election/:id/rolls/flag', asyncHandler(flagElectionRoll))

 /** @swagger
 * /Election/{id}/rolls/invalidate:
 *   post:
 *     summary: Invalidate an election roll
 *     tags: [Rolls]
 *     security:
 *      - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               electionRollEntry:
 *                 type: object
 *                 $ref: '#/components/schemas/ElectionRoll'
 *     responses:
 *       200:
 *         description: Roll invalidated
 *       404:
 *         description: Election not found */
 rollRouter.post('/Election/:id/rolls/invalidate', asyncHandler(invalidateElectionRoll))
/** 
 * 
 * @swagger
 * /Election/{id}/rolls/unflag:
 *   post:
 *     summary: Unflag an election roll
 *     tags: [Rolls]
 *     security:
 *      - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 * 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               electionRollEntry:
 *                 type: object
 *                 $ref: '#/components/schemas/ElectionRoll'
 *     responses:
 *       200:
 *         description: Roll unflagged
 *       404:
 *         description: Election not found */
rollRouter.post('/Election/:id/rolls/unflag', asyncHandler(uninvalidateElectionRoll))

/**
 * @swagger
 * /Election/{id}/rolls/revealVoterId:
 *   post:
 *     summary: 🚨 EMERGENCY BREAK GLASS - Reveal voter ID by email address
 *     description: This endpoint should only be used in emergency situations. It reveals the voter_id for a given email and creates a prominent audit log entry.
 *     tags: [Rolls]
 *     security:
 *      - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email address of the voter
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Voter ID revealed (action logged)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 voter_id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 warning:
 *                   type: string
 *       404:
 *         description: Voter not found
 */
rollRouter.post('/Election/:id/rolls/revealVoterId', asyncHandler(revealVoterIdByEmail))

rollRouter.param('id', asyncHandler(getElectionByID))
rollRouter.param('id', asyncHandler(electionSpecificAuth))
rollRouter.param('id', asyncHandler(electionPostAuthMiddleware))
