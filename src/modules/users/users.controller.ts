import { Request, Response, NextFunction } from "express";
import * as usersService from "./users.service";
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from "./users.schema";

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.createUser(req.body as CreateUserInput);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.listUsers(req.query as unknown as ListUsersQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getUserById(req.params.id as string);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.updateUser(
      req.params.id as string,
      req.user!.userId,
      req.body as UpdateUserInput
    );
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await usersService.deleteUser(req.params.id as string, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
