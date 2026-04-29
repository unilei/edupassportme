-- Add tsvector column for full-text search
ALTER TABLE "Listing" ADD COLUMN "searchVector" tsvector;

-- Populate the search vector from existing data
UPDATE "Listing" SET "searchVector" =
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("content", '')), 'C');

-- Create GIN index for fast full-text search
CREATE INDEX "Listing_searchVector_idx" ON "Listing" USING GIN ("searchVector");

-- Create trigger function to auto-update search vector
CREATE OR REPLACE FUNCTION listing_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."content", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER listing_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "title", "description", "content"
  ON "Listing"
  FOR EACH ROW
  EXECUTE FUNCTION listing_search_vector_update();

-- Also add tsvector + GIN index for Item table (legacy search)
ALTER TABLE "Item" ADD COLUMN "searchVector" tsvector;

UPDATE "Item" SET "searchVector" =
  setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'B');

CREATE INDEX "Item_searchVector_idx" ON "Item" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION item_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER item_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "name", "description"
  ON "Item"
  FOR EACH ROW
  EXECUTE FUNCTION item_search_vector_update();
