CREATE TABLE `tiradas` (
	`id` text PRIMARY KEY NOT NULL,
	`partida_id` text NOT NULL,
	`temporada` integer NOT NULL,
	`indice` integer NOT NULL,
	`ocasion_id` text NOT NULL,
	`opcion_id` text NOT NULL,
	`salio` integer NOT NULL,
	`texto` text NOT NULL,
	`tirada_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`partida_id`) REFERENCES `partidas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tiradas_por_temporada` ON `tiradas` (`partida_id`,`temporada`);--> statement-breakpoint
CREATE UNIQUE INDEX `tiradas_una_por_momento` ON `tiradas` (`partida_id`,`temporada`,`indice`);