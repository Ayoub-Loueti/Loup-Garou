-- Loup-Garou Game Database Schema
-- Creates tables and security policies for the Werewolf social deduction game

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_code text UNIQUE NOT NULL,
  join_code text UNIQUE NOT NULL,
  status text DEFAULT 'waiting',
  phase text DEFAULT 'night',
  day_number integer DEFAULT 0,
  current_turn text DEFAULT '',
  winner text DEFAULT NULL,
  discussion_end_time timestamptz DEFAULT NULL,
  voting_end_time timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz DEFAULT NULL,
  ended_at timestamptz DEFAULT NULL
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read games"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert games"
  ON games FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update games"
  ON games FOR UPDATE
  USING (true);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text DEFAULT '',
  is_alive boolean DEFAULT true,
  is_host boolean DEFAULT false,
  position integer DEFAULT 0,
  protected_tonight boolean DEFAULT false,
  witch_heal_used boolean DEFAULT false,
  witch_poison_used boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert players"
  ON players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update players"
  ON players FOR UPDATE
  USING (true);

-- Night actions table
CREATE TABLE IF NOT EXISTS night_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  actor_id uuid REFERENCES players(id) ON DELETE CASCADE,
  target_id uuid REFERENCES players(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE night_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read night actions"
  ON night_actions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert night actions"
  ON night_actions FOR INSERT
  WITH CHECK (true);

-- Day votes table
CREATE TABLE IF NOT EXISTS day_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  voter_id uuid REFERENCES players(id) ON DELETE CASCADE,
  target_id uuid REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(game_id, day_number, voter_id)
);

ALTER TABLE day_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read votes"
  ON day_votes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert votes"
  ON day_votes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update votes"
  ON day_votes FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete votes"
  ON day_votes FOR DELETE
  USING (true);