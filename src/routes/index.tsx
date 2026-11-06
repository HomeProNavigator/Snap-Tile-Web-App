import { createFileRoute } from "@tanstack/react-router";
import { SnapApp } from "@/snaptile/screens";

export const Route = createFileRoute("/")({ component: SnapApp });
