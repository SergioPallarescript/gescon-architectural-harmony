-- Allow sender to delete their own signature documents
CREATE POLICY "Sender can delete own documents"
ON public.signature_documents
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());
