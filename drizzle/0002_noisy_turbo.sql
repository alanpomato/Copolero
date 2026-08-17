DROP INDEX `tiradas_por_temporada`;--> statement-breakpoint
DROP INDEX `tiradas_una_por_momento`;--> statement-breakpoint
ALTER TABLE `tiradas` ADD `rol` text DEFAULT 'futbolista' NOT NULL;--> statement-breakpoint
CREATE INDEX `tiradas_por_temporada` ON `tiradas` (`partida_id`,`temporada`,`rol`);--> statement-breakpoint
CREATE UNIQUE INDEX `tiradas_una_por_momento` ON `tiradas` (`partida_id`,`temporada`,`rol`,`indice`);