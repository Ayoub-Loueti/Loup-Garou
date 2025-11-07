-- Enable realtime for all game tables

ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE night_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE day_votes;