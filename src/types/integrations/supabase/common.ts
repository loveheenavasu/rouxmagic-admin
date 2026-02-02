export interface CommonSchema {
    id:string;
    created_at:string;
    updated_at?:string;
}

export enum Tables {
    Projects = "projects",
    Recipes = "recipes",
    Chapters = "chapters",
    Footer = "footer"
}