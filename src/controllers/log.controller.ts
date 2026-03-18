import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

const prisma = new PrismaClient();

// -------------------------------------------------------------
// POST /api/v1/logs/bathroom
// -------------------------------------------------------------
export const registerBathroomVisit = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { timestamp, was_urgent, leak_occurred } = req.body;
        
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        const userId = req.user.id;

        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!dbUser) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const logTime = timestamp ? new Date(timestamp) : new Date();

        // Register the visit in the database
        await prisma.log.create({
            data: {
                userId: dbUser.id,
                type: 'BATHROOM',
                timestamp: logTime,
                wasUrgent: was_urgent || false,
                leakOccurred: leak_occurred || false,
            }
        });

        // Calculate next visit suggestion
        const nextSuggestion = new Date(logTime.getTime() + (dbUser.currentIntervalMins * 60 * 1000));

        // Get daily count
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const count = await prisma.log.count({
            where: {
                userId: dbUser.id,
                type: 'BATHROOM',
                timestamp: {
                    gte: startOfDay
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Visita registrada con éxito',
            next_suggestion_time: nextSuggestion.toISOString(),
            daily_count: count
        });

    } catch (error) {
        console.error("Error registering log:", error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// -------------------------------------------------------------
// GET /api/v1/logs/daily-summary
// -------------------------------------------------------------
export const getDailySummary = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        const userId = req.user.id;
        
        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!dbUser) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        const now = new Date();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Calculate next suggestion based on last visit
        const lastVisit = await prisma.log.findFirst({
            where: { userId: dbUser.id, type: 'BATHROOM' },
            orderBy: { timestamp: 'desc' }
        });

        let nextSuggestionTime = null;
        if (lastVisit) {
            nextSuggestionTime = new Date(lastVisit.timestamp.getTime() + (dbUser.currentIntervalMins * 60 * 1000)).toISOString();
        } else {
            // default to 3h from now if no history exists at all
            nextSuggestionTime = new Date(now.getTime() + (dbUser.currentIntervalMins * 60 * 1000)).toISOString();
        }

        const todayLogs = await prisma.log.findMany({
            where: {
                userId: dbUser.id,
                type: 'BATHROOM',
                timestamp: { gte: startOfDay }
            },
            orderBy: { timestamp: 'desc' }
        });

        // Map relative times (for prototype sake)
        const historyDetails = todayLogs.map(log => {
            const diffMs = now.getTime() - log.timestamp.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs / (1000 * 60)) % 60);
            
            let label = "Hace poco";
            if (hours > 0) {
                label = `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
            } else if (mins > 0) {
                label = `Hace ${mins} min`;
            }

            return { time: log.timestamp.toISOString(), label };
        });

        return res.status(200).json({
            success: true,
            data: {
                date: now.toISOString().split('T')[0],
                visits_today: todayLogs.length,
                target_visits: 7, // Placeholder or fetch user goal depending on business logic
                next_suggestion_time: nextSuggestionTime,
                history: historyDetails
            }
        });

    } catch (error) {
        console.error("Error getting summary:", error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
