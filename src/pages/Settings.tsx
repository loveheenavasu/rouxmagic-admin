import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your application settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Coming soon...</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Settings configuration will be added here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
