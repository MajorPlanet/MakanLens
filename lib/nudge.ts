// Shared shapes for the Ondeh nudge (client builds the context, server calls Claude).
import { z } from "zod";

export const ONDEH_POSES = ["happy", "hungry", "wink", "sulking", "concerned", "sleepy"] as const;
export type OndehPose = (typeof ONDEH_POSES)[number];

export const nudgeContextSchema = z.object({
  time_now: z.string().max(40),
  calories_eaten: z.number().finite().min(0).max(20000),
  daily_target: z.number().finite().min(0).max(20000),
  meals_logged_today: z.number().int().min(0).max(100),
  last_meal_time: z.string().max(40).nullable(),
  recent_foods: z.array(z.string().max(80)).max(10),
  streak_days: z.number().int().min(0).max(10000),
  days_low_intake: z.number().int().min(0).max(31),
  user_note: z.string().max(300).default(""),
  recent_messages: z.array(z.string().max(300)).max(3).default([]),
});
export type NudgeContext = z.infer<typeof nudgeContextSchema>;

export const nudgeSchema = z.object({
  scenario: z.string().min(1).max(80),
  pose: z.enum(ONDEH_POSES),
  message: z.string().min(1).max(400),
});
export type Nudge = z.infer<typeof nudgeSchema>;
