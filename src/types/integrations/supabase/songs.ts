import { Project, GetProjectsOpts, ProjectFormData } from "./projects";

export interface Song extends Project {}
export interface SongFormData extends ProjectFormData {}
export interface GetSongsOpts extends GetProjectsOpts {}
