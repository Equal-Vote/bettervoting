import { Router } from 'express';
const electionsRouter = Router();

import {    
    returnElection,
    getElectionByID,
    electionSpecificAuth,
    electionPostAuthMiddleware,
    electionExistsByID,
    archiveElection,
    createElectionController,
    deleteElection,
    editElection,
    editElectionRoles,
    finalizeElection,
    getElectionResults,
    getElections,
    getGlobalElectionStats,
    getSandboxResults,
    sendInvitationController,
    sendInvitationsController,
    setOpenState,
    setPublicResults,
    sendEmailsController,
    queryElections,
} from '../Controllers/Election';
import {upload, uploadImageController} from '../Controllers/uploadImageController';
import asyncHandler from 'express-async-handler';




/**
 * @swagger
 * /Election/{id}:
 *   get:
 *     summary: Get election by ID
 *     tags: [Elections]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     responses:
 *       200:
 *         description: The election description by ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Election'
 *       404:
 *         description: Election not found 
*/

electionsRouter.get('/Election/:id', asyncHandler(returnElection));


/** 
 * @swagger
 * /Election/{_id}/exists:
 *   get:
 *     summary: Check if election exists by ID
 *     tags: [Elections]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     responses:
 *       200:
 *         description: Election exists
 *         content: 
 *          application/json:
 *           schema:
 *            type: object
 *            properties:
 *             exists:
 *              type: boolean
 * 
 *       404:
 *         description: Election not found
 */
electionsRouter.get('/Election/:_id/exists', asyncHandler(electionExistsByID))

/**
 * @swagger
 * /Election/{id}:
 *  delete:
 *    summary: Delete election by ID
 *    tags: [Elections]
 *    security:
 *      - ApiKeyAuth: []

 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: The election ID
 *    responses:
 *      200:
 *        description: Election deleted
 *      404:
 *        description: Election not found
*/
electionsRouter.delete('/Election/:id', asyncHandler(deleteElection))

 
/** 
 * @swagger
 * /Elections:
 *   get:
 *     summary: Get all elections
 *     tags: [Elections]
 *     responses:
 *       200:
 *         description: List of elections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 elections_as_official:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/Election'
 *                     - type: null
 *                 elections_as_unsubmitted_voter:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/Election'
 *                     - type: null
 *                     - type: undefined
 *                 elections_as_submitted_voter:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/Election'
 *                     - type: null
 *                 open_elections:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/Election'
 *                     - type: null
  */
 electionsRouter.get('/Elections', asyncHandler(getElections))
 
/** 
 * @swagger
 * /Elections:
 *   post:
 *     summary: Create a new election
 *     tags: [Elections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *                 Election:
 *                  $ref: '#/components/schemas/NewElection'
 *     responses:
 *       200:
 *         description: Election created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   $ref: '#/components/schemas/Election'
 *  */
 electionsRouter.post('/Elections/', asyncHandler(createElectionController))
 
/** 
 * @swagger
 * /QueryElections:
 *   get:
 *     summary: Query Elections based on time range (sys-admin only)
 *     tags: [Elections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               start_time:
 *                 type: date
 *               end_time:
 *                 type: date
 *     responses:
 *       200:
 *         description: List of elections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 open_elections:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/Election'
 *                     - type: null
 *                 closed_elections:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/Election'
 *                     - type: null
 *                     - type: undefined
 *                 popular_elections:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/Election'
 *                     - type: null
 *                 vote_counts:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         type: object
 *                     - type: null
  */
 electionsRouter.post('/QueryElections', asyncHandler(queryElections))
 
 /** 
 * 
 * @swagger
 * /GlobalElectionStats:
 *   get:
 *     summary: Get global election statistics
 *     tags: [Elections]
 *     responses:
 *       200:
 *         description: Global election statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 elections:
 *                   type: number
 *                   description: Number of elections
 *                 votes:
 *                   type: number
 *                   description: Number of votes
 *  */
 electionsRouter.get('/GlobalElectionStats', asyncHandler(getGlobalElectionStats))
/** 
 * @swagger
 * /Election/{id}/edit:
 *   post:
 *     summary: Edit an election
 *     tags: [Elections]
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
 *      content:
 *       application/json:
 *        schema:
 *          type: object
 *          properties:
 *           Election:
 *             $ref: '#/components/schemas/Election'
 *     responses:
 *       200:
 *         description: Election edited
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   $ref: '#/components/schemas/Election'
 *                 voterAuth:
 *                   type: object
 *                   properties:
 *                     authorized_voter:
 *                       type: boolean
 *                     has_voted:
 *                       type: boolean
 *                     roles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/roles'
 *                     permissions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/permissions'
 *       404:
 *         description: Election not found */
 electionsRouter.post('/Election/:id/edit', asyncHandler(editElection))

 /** 
 * @swagger
 * /Election/{id}/roles:
 *   put:
 *     summary: Edit election roles
 *     security:
 *      - ApiKeyAuth: []
 *     tags: [Elections]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_ids:
 *                type: array
 *                items: 
 *                 type: string
 *               audit_ids:
 *                type: array
 *                items: 
 *                 type: string
 *               credential_ids:
 *                type: array
 *                items: 
 *                 type: string
 *     responses:
 *       200:
 *         description: Roles edited
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   $ref: '#/components/schemas/Election'
 *       404:
 *         description: Election not found */
 electionsRouter.put('/Election/:id/roles', asyncHandler(editElectionRoles))
 
/** 
 * @swagger
 * /ElectionResult/{id}:
 *   get:
 *     summary: Get election results by ID
 *     tags: [Elections]
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
 *         description: Election results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   $ref: '#/components/schemas/Election'
 *                 results:
 *                   type: object
 *                   $ref: '#/components/schemas/ElectionResults'
 *       404:
 *         description: Election not found */
 electionsRouter.get('/ElectionResult/:id', asyncHandler(getElectionResults))
 

/** 
 * @swagger
 * /Election/{id}/finalize:
 *   post:
 *     summary: Finalize an election
 *     tags: [Elections]
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
 *         description: Election finalized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   $ref: '#/components/schemas/Election'
 *       404:
 *         description: Election not found */
electionsRouter.post('/Election/:id/finalize',asyncHandler(finalizeElection))

/** 
 * @swagger
 * /Election/{id}/setPublicResults:
 *   post:
 *     summary: Set public results for an election
 *     tags: [Elections]
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
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *                public_results:
 *                  type: boolean
 *     responses:
 *       200:
 *         description: Public results set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   $ref: '#/components/schemas/Election'
 *       404:
 *         description: Election not found */
electionsRouter.post('/Election/:id/setPublicResults',asyncHandler(setPublicResults))

 /** 
 * @swagger
 * /Election/{id}/archive:
 *   post:
 *     summary: Archive an election
 *     security:
 *      - ApiKeyAuth: []
 *     tags: [Elections]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     responses:
 *       200:
 *         description: Election archived
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   $ref: '#/components/schemas/Election'
 *       404:
 *         description: Election not found 
*/
electionsRouter.post('/Election/:id/archive', asyncHandler(archiveElection))

 /** 
 * @swagger
 * /Election/{id}/setOpenState:
 *   post:
 *     summary: Change an election's state from open to closed, or from closed to open
 *     security:
 *      - ApiKeyAuth: []
 *     tags: [Elections]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The election ID
 *     requestBody:
 *      content:
 *        application/json:
 *          name: closing
 *          schema:
 *            type: boolean
 *         description: True if closing an open election; false if reopening a closed election
 *     responses:
 *       200:
 *         description: Election state changed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   $ref: '#/components/schemas/Election'
 *       404:
 *         description: Election not found 
*/
electionsRouter.post('/Election/:id/setOpenState', asyncHandler(setOpenState))

/** 
 * @swagger
 * /Election/{id}/sendInvites:
 *   post:
 *     summary: Send invitations for an election
 *     tags: [Elections]
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
 *         description: Invitations sent
 *       404:
 *         description: Election not found */
electionsRouter.post('/Election/:id/sendInvites', asyncHandler(sendInvitationsController))

/** 
 * @swagger
 * /Election/{id}/sendInvites:
 *   post:
 *     summary: Send invitations for an election
 *     tags: [Elections]
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
 *         description: Invitations sent
 *       404:
 *         description: Election not found */
electionsRouter.post('/Election/:id/sendEmails', asyncHandler(sendEmailsController))

/** 
 * @swagger
 * /Election/{id}/sendInvite/{voter_id}:
 *   post:
 *     summary: Send an invitation to a specific voter
 *     tags: [Elections]
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
 *         description: Invitation sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 electionRollEntry:
 *                   type: object
 *                   $ref: '#/components/schemas/ElectionRoll'
 *       404:
 *         description: Election or voter not found */
electionsRouter.post('/Election/:id/sendInvite/:voter_id', asyncHandler(sendInvitationController))

 /** 
 * @swagger
 * /Sandbox:
 *   post:
 *     summary: Get sandbox results
 *     tags: [Elections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cvr:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items: 
 *                     type: "number"
 *               candidates:
 *                 type: array
 *                 items: 
 *                   type: string
 *               num_winners:
 *                 type: number
 *               votingMethod:
 *                 type: object
 *                 $ref: '#/components/schemas/VotingMethod'
 *                 
 *     responses:
 *       200:
 *         description: Sandbox results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: object
 *                   $ref: '#/components/schemas/ElectionResults'
 *                 nWinners:
 *                   type: number
 *                   description: Number of winners
 *                 candidates:
 *                   type: array
 *                   items: 
 *                      type: string 
 * 
 */
 electionsRouter.post('/Sandbox',asyncHandler(getSandboxResults))

/** 
 * @swagger
 * /images:
 *   post:
 *     summary: Upload an image
 *     tags: [Elections]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 photo_filename:
 *                   oneOf: 
 *                     - string
 *                     - null
 */
electionsRouter.post('/images',upload.single("file"), asyncHandler(uploadImageController))


  



//router.param('id', asyncHandler(electionController.getElectionByID))
electionsRouter.param('id', asyncHandler(getElectionByID))
electionsRouter.param('id', asyncHandler(electionSpecificAuth))
electionsRouter.param('id', asyncHandler(electionPostAuthMiddleware))

export {electionsRouter};
