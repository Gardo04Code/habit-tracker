-- Fijar search_path explícito (evita hijacking de search_path)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

-- Estas funciones solo deben ejecutarse vía trigger, no como RPC pública
revoke execute on function public.set_updated_at()
  from public, anon, authenticated;

revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

-- rls_auto_enable puede existir en algunos entornos, pero no forma parte
-- de una instalación limpia. Solo retirar permisos si realmente existe.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable()
      from public, anon, authenticated;
  end if;
end;
$$;