INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('run-photos', 'run-photos', true),
  ('stories', 'stories', true),
  ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY avatars_public ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY avatars_upload ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY run_photos_public ON storage.objects FOR SELECT USING (bucket_id = 'run-photos');
CREATE POLICY run_photos_upload ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'run-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY stories_public ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY stories_upload ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY posts_public ON storage.objects FOR SELECT USING (bucket_id = 'posts');
CREATE POLICY posts_upload ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]
);
