-- function
CREATE OR REPLACE FUNCTION plainto_tsquery_or(input_text TEXT) RETURNS tsquery AS $$
DECLARE
  lexemes TEXT[];
  query_string TEXT;
BEGIN
  -- Split the input text into lexemes
  lexemes := string_to_array(input_text, ' ');

  -- Join lexemes with ' | ' to create the OR query string
  query_string := array_to_string(lexemes, ' | ');

  -- Return the tsquery
  RETURN to_tsquery('english', query_string);
END;
$$ LANGUAGE plpgsql;