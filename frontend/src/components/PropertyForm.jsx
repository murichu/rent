/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';

const PropertySchema = Yup.object().shape({
  address: Yup.string().required('Address is required'),
  type: Yup.string().required('Type is required'),
  description: Yup.string().required('Description is required')
});

const PropertyForm = ({ onSubmit }) => (
  <Formik
    initialValues={{ address: '', type: '', description: '' }}
    validationSchema={PropertySchema}
    onSubmit={values => onSubmit(values)}
  >
    {({ errors, touched }) => (
      <Form>
        <div>
          <label htmlFor="address">Address</label>
          <Field name="address" type="text" />
          {errors.address && touched.address ? (
            <div>{errors.address}</div>
          ) : null}
        </div>
        <div>
          <label htmlFor="type">Type</label>
          <Field name="type" type="text" />
          {errors.type && touched.type ? <div>{errors.type}</div> : null}
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <Field name="description" as="textarea" />
          {errors.description && touched.description ? (
            <div>{errors.description}</div>
          ) : null}
        </div>
        <button type="submit">Submit</button>
      </Form>
    )}
  </Formik>
);

export default PropertyForm;
