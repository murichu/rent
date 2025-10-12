// eslint-disable-next-line no-unused-vars
import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().required('Password is required')
});

const LoginForm = () => {
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    try {
      const res = await axios.post('/auth/login', values);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validationSchema={LoginSchema}
      onSubmit={handleSubmit}
    >
      {({ errors, touched }) => (
        <Form>
          <div>
            <label htmlFor="email">Email</label>
            <Field name="email" type="email" />
            {errors.email && touched.email ? <div>{errors.email}</div> : null}
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <Field name="password" type="password" />
            {errors.password && touched.password ? <div>{errors.password}</div> : null}
          </div>
          <button type="submit">Login</button>
        </Form>
      )}
    </Formik>
  );
};

export default LoginForm;

