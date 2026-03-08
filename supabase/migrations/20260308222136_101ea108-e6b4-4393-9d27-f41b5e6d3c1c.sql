
CREATE OR REPLACE FUNCTION public.handle_chat_attachment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _doc_id UUID; _attachments JSONB;
BEGIN
  _attachments := COALESCE(NEW.attachments, '[]'::JSONB);
  IF jsonb_array_length(_attachments) > 0 THEN
    FOR i IN 0..jsonb_array_length(_attachments) - 1 LOOP
      INSERT INTO public.documents (name, type, size_display, folder_path, author, source, storage_path, storage_bucket)
      VALUES (
        _attachments->i->>'name',
        COALESCE((_attachments->i->>'type')::document_type, 'txt'),
        _attachments->i->>'size',
        '/Chat Attachments',
        NEW.sender_id,
        'Chat: ' || (SELECT name FROM public.chat_channels WHERE id = NEW.channel_id),
        _attachments->i->>'storagePath',
        COALESCE(_attachments->i->>'storageBucket', 'chat-attachments')
      )
      RETURNING id INTO _doc_id;
      INSERT INTO public.chat_document_links (message_id, document_id) VALUES (NEW.id, _doc_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_chat_message_attachments ON public.chat_messages;
CREATE TRIGGER on_chat_message_attachments
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  WHEN (jsonb_array_length(COALESCE(NEW.attachments, '[]'::jsonb)) > 0)
  EXECUTE FUNCTION public.handle_chat_attachment();
