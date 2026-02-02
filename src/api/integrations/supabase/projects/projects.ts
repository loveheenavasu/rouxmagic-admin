import { CRUDWrapper } from "@/core";
import {
  Project,
  GetProjectsOpts,
  ProjectFormData,
  Tables
} from "@/types";

export const Projects = new CRUDWrapper<Project, ProjectFormData, GetProjectsOpts>(Tables.Projects);