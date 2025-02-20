"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { utapi } from "@board-games/api/uploadthing";
import {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/schema";

import { api } from "~/trpc/server";
import { gameSchema } from "./addGameDialog";

export type FormState = {
  message: string;
  fields?: Record<string, string>;
  issues?: string[];
};

const formSchema = z.object({
  game: z
    .object({
      name: z.string().min(1, {
        message: "Game name is required",
      }),
      ownedBy: z.boolean(),
      gameImg: z
        .instanceof(File)
        .refine((file) => file.size <= 4000000, `Max image size is 4MB.`)
        .refine(
          (file) => file.type === "image/jpeg" || file.type === "image/png",
          "Only .jpg and .png formats are supported.",
        )
        .nullable(),
      playersMin: z.number().min(1).nullable(),
      playersMax: z.number().positive().nullable(),
      playtimeMin: z.number().min(1).positive().nullable(),
      playtimeMax: z.number().positive().nullable(),
      yearPublished: z
        .number()
        .min(1900)
        .max(new Date().getFullYear())
        .nullable(),
    })
    .superRefine((values, ctx) => {
      if (
        values.playersMin &&
        values.playersMax &&
        values.playersMin > values.playersMax
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Players min must be less than or equal to players max.",
          path: ["playersMin"],
        });
      }
      if (
        values.playtimeMin &&
        values.playtimeMax &&
        values.playtimeMin > values.playtimeMax
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Playtime min must be less than or equal to playtime max.",
          path: ["playtimeMin"],
        });
      }
    }),
  scoresheet: insertScoreSheetSchema
    .omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      type: true,
      gameId: true,
    })
    .required({ name: true })
    .or(z.null()),
  rounds: z.array(
    insertRoundSchema
      .omit({
        id: true,
        createdAt: true,
        updatedAt: true,
        scoresheetId: true,
      })
      .required({ name: true }),
  ),
});
export async function addGameSubmitAction(data: FormData) {
  const formData = Object.fromEntries(data);
  if (formData.scoresheet !== undefined) {
    formData.scoresheet = JSON.parse(formData.scoresheet as string);
  }
  if (formData.rounds !== undefined) {
    formData.rounds = JSON.parse(formData.rounds as string);
  }
  const parsed = formSchema.safeParse({
    game: {
      name: data.get("name"),
      ownedBy: JSON.parse(data.get("ownedBy")?.toString() ?? "null"),
      playersMin: JSON.parse(data.get("playersMin")?.toString() ?? "null"),
      playersMax: JSON.parse(data.get("playersMax")?.toString() ?? "null"),
      playtimeMin: JSON.parse(data.get("playtimeMin")?.toString() ?? "null"),
      playtimeMax: JSON.parse(data.get("playtimeMax")?.toString() ?? "null"),
      yearPublished: JSON.parse(
        data.get("yearPublished")?.toString() ?? "null",
      ),
      gameImg:
        data.get("gameImg") === "null" ? null : (data.get("gameImg") as File),
    },
    scoresheet: formData.scoresheet,
    rounds: formData.rounds,
  });
  if (!parsed.success) {
    console.error(JSON.stringify(parsed));
    const fields: Record<string, string> = {};
    for (const key of Object.keys(formData)) {
      fields[key] = formData[key]?.toString() ?? "";
    }
    return {
      data: null,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  if (!parsed.data.game.gameImg) {
    await api.game.create({
      game: {
        name: parsed.data.game.name,
        ownedBy: parsed.data.game.ownedBy,
        playersMin: parsed.data.game.playersMin,
        playersMax: parsed.data.game.playersMax,
        playtimeMin: parsed.data.game.playtimeMin,
        playtimeMax: parsed.data.game.playtimeMax,
        yearPublished: parsed.data.game.yearPublished,
        imageId: null,
      },
      scoresheet: parsed.data.scoresheet,
      rounds: parsed.data.rounds,
    });
    revalidatePath("/dashboard/games");
    return { errors: null, data: "Game Created" };
  } else {
    try {
      const imageFile = parsed.data.game.gameImg;

      const imageId = await uploadFileToUploadThing(imageFile);
      await api.game.create({
        game: {
          name: parsed.data.game.name,
          ownedBy: parsed.data.game.ownedBy,
          playersMin: parsed.data.game.playersMin,
          playersMax: parsed.data.game.playersMax,
          playtimeMin: parsed.data.game.playtimeMin,
          playtimeMax: parsed.data.game.playtimeMax,
          yearPublished: parsed.data.game.yearPublished,
          imageId: imageId,
        },
        scoresheet: parsed.data.scoresheet,
        rounds: parsed.data.rounds,
      });
    } catch (error) {
      console.error("Error uploading Image:", error);
      return {
        errors: "There was a problem uploading your Image.",
        data: null,
      };
    } finally {
      revalidatePath("/dashboard/games");
      return { errors: null, data: "Game Created" };
    }
  }
}
export async function uploadFileToUploadThing(file: File) {
  const { userId } = await auth();

  if (!userId) throw new Error("Unauthorized");

  const [uploadResult] = await utapi.uploadFiles([file]);
  if (!uploadResult || uploadResult.error) {
    console.error(uploadResult?.error);
    throw new Error("Image upload failed");
  }
  const image = await api.image.create({
    name: uploadResult.data.name,
    url: uploadResult.data.url,
  });

  return image.id;
}
