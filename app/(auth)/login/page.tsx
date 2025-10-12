'use client';

import {
  Paper,
  TextInput,
  PasswordInput,
  Checkbox,
  Button,
  Title,
  Text,
  Container,
  Group,
  Anchor,
  Stack,
} from '@mantine/core';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSchema, LoginInput } from '../../../lib/schemas/auth.schema'
import { showSuccessNotification, showErrorNotification, showWarningNotification } from '@/lib/notifications';


export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          login: values.login,
          password: values.password,
        }),
      });

      const data = await response.json();


      console.log(response);

      if (response.ok) {

        if (data.token) {
          // Store the full token in localStorage for easy client-side access
          // Your React components can read this to make authenticated API requests
          localStorage.setItem('token', data.token);
          
          // Also store user information so your UI can display user details
          // without making an additional API request
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Store the token in a cookie for middleware to check authentication
          // This is what your middleware.ts will read to protect routes
          const maxAge = values.rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 24; // 7 days or 1 day
          document.cookie = `auth_token=${data.token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
        }
        showSuccessNotification(
          'Login Success',
          'credentials authenticated'
        );
      } else {
        showErrorNotification(
          'Login Failed',
          'Incorrect credentials'
        );
        reset({
          login: values.login, // Keep the email they entered
          password: '', // Clear the password
        });
      }
    } catch (error) {
      // setError('email', { 
      //   type: 'manual', 
      //   message: 'Something went wrong. Please try again.' 
      // });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900} style={{ fontSize: '2rem' }}>
        Welcome back!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Do not have an account yet?{' '}
        <Anchor size="sm" component="button">
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            <TextInput
              label="Login"
              // placeholder="you@example.com"
              required
              {...register('login')}
              error={errors.login?.message}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              {...register('password')}
              error={errors.password?.message}
            />

            <Group justify="space-between">
              <Controller
                name="rememberMe"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Remember me"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Anchor component="button" size="sm" type="button">
                Forgot password?
              </Anchor>
            </Group>

            <Button type="submit" fullWidth loading={loading}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}